const MOBILE_MAX_WIDTH = 640;

const body = document.body;
const header = document.querySelector('.header');
const brandRow = document.querySelector('.brand-row');
const actionStack = document.querySelector('.action-stack');

if (body && header && brandRow && actionStack) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`);
  let menuBtn;
  let backdrop;
  let menuHeader;
  let mobileNav;
  let closeBtn;

  const buildSection = (title, links) => {
    if (!links.length) return null;
    const section = document.createElement('div');
    section.className = 'mobile-nav-section';

    const label = document.createElement('div');
    label.className = 'mobile-nav-title';
    label.textContent = title;

    const list = document.createElement('div');
    list.className = 'mobile-nav-links';

    links.forEach((link) => {
      const href = link.getAttribute('href');
      const text = link.textContent ? link.textContent.trim() : '';
      if (!href || !text) return;
      const anchor = document.createElement('a');
      anchor.className = 'mobile-nav-link';
      anchor.href = href;
      anchor.textContent = text;
      list.appendChild(anchor);
    });

    if (!list.children.length) return null;

    section.appendChild(label);
    section.appendChild(list);
    return section;
  };

  const toggleMenu = (forceOpen) => {
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !body.classList.contains('mobile-menu-open');
    body.classList.toggle('mobile-menu-open', shouldOpen);
    if (menuBtn) {
      menuBtn.textContent = shouldOpen ? 'Close' : 'Menu';
      menuBtn.setAttribute('aria-expanded', String(shouldOpen));
    }
  };

  const initMenu = () => {
    if (!mql.matches || menuBtn) return;

    menuBtn = document.createElement('button');
    menuBtn.type = 'button';
    menuBtn.className = 'mobile-menu-btn';
    menuBtn.textContent = 'Menu';
    menuBtn.setAttribute('aria-expanded', 'false');

    backdrop = document.createElement('div');
    backdrop.className = 'mobile-menu-backdrop';

    menuHeader = document.createElement('div');
    menuHeader.className = 'mobile-menu-header';
    menuHeader.innerHTML = '<div class="mobile-menu-title">Menu</div>';

    closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'mobile-menu-close';
    closeBtn.textContent = 'Close';
    menuHeader.appendChild(closeBtn);

    mobileNav = document.createElement('div');
    mobileNav.className = 'mobile-nav';

    const formatLinks = Array.from(document.querySelectorAll('.header-strip--format .nav-link'));
    const editionLinks = Array.from(document.querySelectorAll('.header-strip--editions .nav-link'));

    const browseSection = buildSection('Browse', formatLinks);
    const editionSection = buildSection('Editions', editionLinks);
    if (browseSection) mobileNav.appendChild(browseSection);
    if (editionSection) mobileNav.appendChild(editionSection);

    menuBtn.addEventListener('click', () => toggleMenu());
    closeBtn.addEventListener('click', () => toggleMenu(false));
    backdrop.addEventListener('click', () => toggleMenu(false));

    brandRow.appendChild(menuBtn);
    actionStack.insertBefore(menuHeader, actionStack.firstChild);
    actionStack.insertBefore(mobileNav, menuHeader.nextSibling);
    document.body.appendChild(backdrop);
  };

  const teardownMenu = () => {
    if (!menuBtn) return;
    body.classList.remove('mobile-menu-open');
    menuBtn.remove();
    backdrop.remove();
    menuHeader.remove();
    mobileNav.remove();
    menuBtn = null;
    backdrop = null;
    menuHeader = null;
    mobileNav = null;
    closeBtn = null;
  };

  const syncMenu = () => {
    if (mql.matches) {
      initMenu();
    } else {
      teardownMenu();
    }
  };

  mql.addEventListener('change', syncMenu);
  syncMenu();
}
