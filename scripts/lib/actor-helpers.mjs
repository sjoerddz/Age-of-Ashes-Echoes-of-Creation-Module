/*
--
SDZ
2026-05-06
Actor and PF2e item helpers for banner / echo detection.
--
*/

/**
 * @returns {Actor[]}
 */
export function getActorsForCurrentUserContextMenu()
{
    /** @type {Actor[]} */
    const out = [];

    if (game.user?.character)
    {
        out.push(game.user.character);
    }

    for (const a of game.actors)
    {
        if (!a?.isOwner)
        {
            continue;
        }

        if (a.type !== "character" && a.type !== "npc")
        {
            continue;
        }

        if (!out.includes(a))
        {
            out.push(a);
        }
    }

    return out;
}

/**
 * "Openly carried" for the Hellknight Banner: equipped and visible use — held in at least one hand,
 * worn on the person (e.g. usage {@code worncloak}), or equivalent PF2e equipped state — but not stowed in a container.
 *
 * @param {Item | null | undefined} item
 * @returns {boolean}
 */
export function isHellknightBannerCarriedOpenly(item)
{
    if (!item)
    {
        return false;
    }

    /** @type {any} */
    const physical = item;

    if (typeof physical.isEquipped === "boolean")
    {
        if (!physical.isEquipped || physical.isStowed === true)
        {
            return false;
        }

        if (physical.isHeld === true && Number(physical.handsHeld) > 0)
        {
            return true;
        }

        if (physical.isWorn === true)
        {
            return true;
        }

        return false;
    }

    const equipped = item.system?.equipped;

    if (equipped && typeof equipped === "object")
    {
        if (equipped.carryType === "stowed" || equipped.carryType === "dropped")
        {
            return false;
        }

        if (equipped.carryType === "worn")
        {
            return true;
        }

        if (equipped.carryType === "held" && Number(equipped.handsHeld) > 0)
        {
            return true;
        }

        if (equipped.inSlot === true)
        {
            return true;
        }
    }

    if (item.system?.equipped === true)
    {
        return true;
    }

    if (item.isEquipped === true)
    {
        return true;
    }

    return false;
}

/**
 * @param {Actor[]} actors
 * @param {string} slug
 * @returns {{ actor: Actor, item: Item } | null}
 */
export function findBannerBearer(actors, slug)
{
    const want = slug.trim().toLowerCase();

    for (const actor of actors)
    {
        for (const item of actor.items)
        {
            if (!itemMatchesSlug(item, want))
            {
                continue;
            }

            if (!isHellknightBannerCarriedOpenly(item))
            {
                continue;
            }

            return { actor, item };
        }
    }

    return null;
}

/**
 * PF2e / Foundry v13: actor may only be on {@link ChatMessage#speakerActor}.
 *
 * @param {ChatMessage | null | undefined} message
 * @returns {Actor | null}
 */
export function getMessageActor(message)
{
    if (!message)
    {
        return null;
    }

    /** @type {Actor | null | undefined} */
    const a = message.actor ?? message.speakerActor;
    if (a)
    {
        return a ?? null;
    }

    /** PF2e strike/check cards may omit embedded actor while {@link ChatMessage#rollActorId} stays set. */
    const rollId = message.rollActorId;
    if (typeof rollId === "string" && rollId.length > 0)
    {
        return game.actors.get(rollId) ?? null;
    }

    return null;
}

/**
 * Match module settings slug to PF2e item display name when {@link Item#slug} is unset.
 *
 * @param {string} name
 * @returns {string}
 */
function slugifyItemNameForMatch(name)
{
    /** @type {any} */
    const g = globalThis.game;
    /** @type {any} */
    const F = globalThis.foundry;

    const tryFn = (/** @type {unknown} */ fn) =>
    {
        if (typeof fn !== "function")
        {
            return null;
        }

        try
        {
            const out = fn(name);
            if (out != null)
            {
                return String(out).toLowerCase();
            }
        }
        catch
        {
            /* ignore */
        }

        return null;
    };

    const fromPf2e =
        tryFn(g?.pf2e?.util?.sluggify) ??
        tryFn(g?.pf2e?.utils?.sluggify) ??
        tryFn(F?.utils?.slugify);
    if (fromPf2e)
    {
        return fromPf2e;
    }

    if (typeof String.prototype.slugify === "function")
    {
        try
        {
            return String(name).slugify({ strict: true }).toLowerCase();
        }
        catch
        {
            /* fall through */
        }
    }

    return approximateSlugFromName(name);
}

function itemMatchesSlug(item, wantSlug)
{
    if (!item || !wantSlug)
    {
        return false;
    }

    const fromDoc = item.slug ?? item.system?.slug;
    if (fromDoc && String(fromDoc).toLowerCase() === wantSlug)
    {
        return true;
    }

    const name = item.name;
    if (!name)
    {
        return false;
    }

    return slugifyItemNameForMatch(name) === wantSlug;
}

/**
 * Last-resort slug when item document slug is missing (some consumables).
 *
 * @param {string} name
 * @returns {string}
 */
function approximateSlugFromName(name)
{
    return String(name)
        .trim()
        .toLowerCase()
        .replace(/[''"]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/**
 * @param {Actor | null | undefined} actor
 * @param {string} slug
 * @returns {Item | null}
 */
export function findItemOnActorBySlug(actor, slug)
{
    if (!actor)
    {
        return null;
    }

    const want = slug.trim().toLowerCase();

    for (const item of actor.items)
    {
        if (itemMatchesSlug(item, want))
        {
            return item;
        }
    }

    return null;
}

/**
 * Mirrors PF2e hero-point reroll visibility on chat cards: poster gate is the same union as PF2e (`isAuthor` or `isOwner` or matching `author`).
 *
 * @param {ChatMessage} message
 * @returns {boolean}
 */
function isPf2eStyleRollPoster(message)
{
    return Boolean(message.isAuthor || message.isOwner || message.author?.id === game.user.id);
}

/**
 * @param {ChatMessage} message
 * @returns {boolean}
 */
export function isOwnPlayerRollMessage(message)
{
    if (!message)
    {
        return false;
    }

    const actor = getMessageActor(message);
    if (!actor?.isOwner)
    {
        return false;
    }

    if (!isPf2eStyleRollPoster(message))
    {
        return false;
    }

    return true;
}
