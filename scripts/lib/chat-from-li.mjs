/*
--
SDZ
2026-05-06
Resolve a ChatMessage from a chat log context-menu target element (Foundry v13+).
--
*/

/**
 * @param {HTMLElement | jQuery | Event | null | undefined} target
 * @returns {HTMLElement | null}
 */
export function normalizeContextTarget(target)
{
    if (target instanceof HTMLElement)
    {
        return target;
    }

    if (target && typeof target === "object" && target[0] instanceof HTMLElement)
    {
        return target[0];
    }

    if (target instanceof Event)
    {
        if (target.currentTarget instanceof HTMLElement)
        {
            return target.currentTarget;
        }

        if (target.target instanceof HTMLElement)
        {
            return target.target;
        }
    }

    return null;
}

/**
 * Foundry v13 {@link foundry.ContextMenu} passes `(pointerEvent, htmlElement)` to {@link foundry.ContextMenuEntry}
 * predicates; only forwarding the first argument breaks when it is an event, not an {@link HTMLElement}.
 *
 * @param {unknown} first
 * @param {unknown} second
 * @returns {HTMLElement | null}
 */
export function resolveContextMenuTarget(first, second)
{
    if (second instanceof HTMLElement)
    {
        return second;
    }

    if (first instanceof HTMLElement)
    {
        return first;
    }

    return normalizeContextTarget(first) ?? normalizeContextTarget(second);
}

/**
 * @param {HTMLElement | null} target
 * @returns {ChatMessage | null}
 */
export function getChatMessageFromContextTarget(target)
{
    if (!target)
    {
        return null;
    }

    const root = target.closest("[data-message-id]");
    if (!root)
    {
        return null;
    }

    const id = root.dataset.messageId;
    if (!id)
    {
        return null;
    }

    return game.messages.get(id) ?? null;
}
