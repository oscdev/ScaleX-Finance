const DROPDOWN_LOCK_MS = 1200;

let dropdownLockUntil = 0;
let dropdownLockTimer: ReturnType<typeof setTimeout> | null = null;
let interactionListenersBound = false;

/**
 * True while a Strapi/Radix dropdown, select, menu, or popover is open.
 * Do NOT treat opacity:0 as closed — Radix open animations start at opacity 0.
 */
export function isAdminOverlayOpen(): boolean {
  if (typeof document === 'undefined') return false;

  // Custom Users → Roles filter (not Radix)
  if (
    document
      .getElementById('custom-admin-role-dropdown')
      ?.getAttribute('data-open') === 'true'
  ) {
    return true;
  }

  const candidates = document.querySelectorAll<HTMLElement>(
    [
      '[data-radix-popper-content-wrapper]',
      '[data-radix-select-content]',
      '[data-radix-popover-content]',
      '[role="listbox"]',
      '[role="menu"][data-state="open"]',
      '[role="dialog"][data-state="open"]',
      '[data-state="open"][role="listbox"]',
      '[data-radix-popper-content-wrapper] [data-state="open"]',
      '#custom-admin-role-dropdown[data-open="true"]',
    ].join(', ')
  );

  for (const el of candidates) {
    const state = el.getAttribute('data-state');
    if (state === 'closed') continue;

    // data-state="open" wins even during opacity/aria-hidden transitions
    if (state === 'open') return true;

    const style = window.getComputedStyle(el);
    if (style.display === 'none') continue;
    if (el.hasAttribute('hidden')) continue;

    // Popper wrappers / listboxes / dialogs present without data-state=closed count as open
    if (
      el.hasAttribute('data-radix-popper-content-wrapper') ||
      el.getAttribute('role') === 'listbox' ||
      el.getAttribute('role') === 'dialog' ||
      el.hasAttribute('data-radix-select-content') ||
      el.hasAttribute('data-radix-popover-content')
    ) {
      return true;
    }
  }

  return false;
}

/** Sticky pause after interacting with a dropdown trigger (covers open animation). */
export function markAdminDropdownInteraction(): void {
  dropdownLockUntil = Date.now() + DROPDOWN_LOCK_MS;
  if (dropdownLockTimer) clearTimeout(dropdownLockTimer);
  dropdownLockTimer = setTimeout(() => {
    dropdownLockUntil = 0;
    dropdownLockTimer = null;
  }, DROPDOWN_LOCK_MS);
}

export function isAdminDropdownInteractionLocked(): boolean {
  return Date.now() < dropdownLockUntil;
}

function isFocusInsideOverlayUi(): boolean {
  const ae = document.activeElement;
  if (!ae || !(ae instanceof Element)) return false;
  if (ae instanceof HTMLSelectElement) return true;
  return !!ae.closest(
    [
      '[data-radix-popper-content-wrapper]',
      '[role="listbox"]',
      '[role="dialog"]',
      '[data-radix-popover-content]',
      '[data-radix-select-content]',
      '#custom-admin-users-filter-controls',
    ].join(', ')
  );
}

/** Pause MutationObserver-driven overrides while a menu/select is opening or open. */
export function shouldPauseAdminOverrides(): boolean {
  return (
    isAdminDropdownInteractionLocked() ||
    isAdminOverlayOpen() ||
    isFocusInsideOverlayUi()
  );
}

function isFiltersNamedButton(el: Element): boolean {
  if (el.tagName !== 'BUTTON' && el.getAttribute('role') !== 'button') {
    const btn = el.closest('button, [role="button"]');
    if (!btn) return false;
    el = btn;
  }
  const label = (
    el.getAttribute('aria-label') ||
    el.textContent ||
    ''
  )
    .trim()
    .toLowerCase();
  return (
    label === 'filters' ||
    label === 'add filter' ||
    label === 'add a filter' ||
    label.startsWith('filters') ||
    label.includes('add filter')
  );
}

function isDropdownTriggerTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (
    target.closest(
      [
        'select',
        '#custom-admin-users-filter-controls',
        '#custom-admin-role-dropdown',
        '#custom-admin-role-select',
        '[role="combobox"]',
        'button[aria-haspopup]',
        '[aria-haspopup="listbox"]',
        '[aria-haspopup="menu"]',
        '[aria-expanded][aria-controls]',
        '[data-radix-collection-item]',
        '[data-radix-popper-content-wrapper]',
        '[role="listbox"]',
        '[data-radix-popover-content]',
        '[data-radix-select-content]',
      ].join(', ')
    )
  ) {
    return true;
  }
  return isFiltersNamedButton(target);
}

/** Register once from startDomOverrides — refresh lock on pointerdown/focusin. */
export function registerAdminDropdownInteractionLock(): void {
  if (typeof window === 'undefined' || interactionListenersBound) return;
  interactionListenersBound = true;

  const onInteract = (e: Event) => {
    if (isDropdownTriggerTarget(e.target)) {
      markAdminDropdownInteraction();
    }
  };

  window.addEventListener('pointerdown', onInteract, true);
  window.addEventListener('focusin', onInteract, true);
}
