(() => {
  'use strict';

  /* ------------------------------------------------------------------
     Team members — single source of truth.
     To add a person: append an entry below. To add a photo: place a 4:5
     portrait in public/assets/team/ and set `photo` (e.g. 'assets/team/yousef.jpg').
     Leave `linkedin` empty until the verified profile URL is confirmed —
     the button is hidden automatically when the value is empty.
     ------------------------------------------------------------------ */
  const TEAM = [
    {
      name: 'Yousef Panahi',
      title: 'Director of Product',
      bio: 'Yousef leads product strategy and delivery at ORVANU, helping transform complex business challenges into practical digital solutions. His experience spans logistics, marketplaces, B2B platforms, and operational software, with a focus on product discovery, strategy, roadmaps, and cross-functional collaboration.',
      expertise: [
        'Product Strategy',
        'Digital Marketplaces',
        'E-commerce Platforms',
        'Logistics & Delivery Tech',
        'Fulfillment & Warehousing',
        'Same-Day & On-Demand Delivery',
        'B2B Platforms',
        '0→1 Product Development'
      ],
      initials: 'YP',
      photo: 'assets/team/yousef.jpg?v=2',
      linkedin: 'https://www.linkedin.com/in/yousef-panahi'
    },
    {
      name: 'Mohammad Behbahani',
      title: 'AI Engineer & Data Scientist',
      bio: 'Mohammad specializes in AI engineering, data science, and optimization, combining machine learning research with practical software development. His experience includes building RAG-powered AI systems, intelligent workflows, predictive models, and cloud-based applications, with a background in e-commerce analytics and supply chain optimization.',
      expertise: [
        'AI Engineering',
        'Machine Learning',
        'RAG & Agentic AI',
        'Data Science',
        'Predictive Analytics',
        'Optimization',
        'Python & FastAPI',
        'Cloud & MLOps'
      ],
      initials: 'MB',
      photo: 'assets/team/mohammad-behbahani.jpg',
      linkedin: 'https://www.linkedin.com/in/mohammad-behbahani-85958775/'
    },
    {
      name: 'Saeed Najafi',
      title: 'Full-Stack Engineer',
      bio: 'Saeed is a full-stack engineer specializing in modern web application development. He works across frontend and backend technologies to build reliable, scalable, and user-friendly software products, with experience in React, Next.js, and TypeScript.',
      expertise: [
        'Full-Stack Engineering',
        'React & Next.js',
        'TypeScript & Node.js',
        'Backend API Development',
        'Real-Time Applications',
        'Fintech Platforms',
        'React Native',
        'Scalable Web Architecture'
      ],
      initials: 'SN',
      photo: 'assets/team/saeed.jpg',
      linkedin: 'https://www.linkedin.com/in/saeed-najafi-developer'
    },
    {
      name: 'Mohammadreza Akbari',
      title: 'Full-Stack Engineer',
      bio: 'Mohammadreza is a full-stack engineer focused on building robust business applications and digital platforms. He works with modern frontend and backend technologies, including Next.js, NestJS, and TypeScript, to deliver maintainable software solutions.',
      expertise: [
        'Full-Stack Engineering',
        'React & Next.js',
        'NestJS & TypeScript',
        'Fintech Applications',
        'Business Dashboards',
        'Admin Panels & Internal Tools',
        'AI-Powered Web Applications',
        'Data Visualization'
      ],
      initials: 'MA',
      photo: 'assets/team/mohammadreza.jpg',
      linkedin: 'https://www.linkedin.com/in/mohammadreza-akbari-developer/'
    }
  ];

  const LINKEDIN_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM10 9h3.8v1.7h.1c.5-.9 1.8-1.9 3.7-1.9 4 0 4.7 2.5 4.7 5.7V21h-4v-5.6c0-1.3 0-3-1.9-3s-2.2 1.4-2.2 2.9V21h-4z"/>' +
    '</svg>';

  function initialsPlaceholder(member) {
    const el = document.createElement('div');
    el.className = 'team-initials';
    el.setAttribute('aria-hidden', 'true');
    el.textContent = member.initials;
    return el;
  }

  function buildPortrait(member) {
    const figure = document.createElement('figure');
    figure.className = 'team-portrait';

    const showPlaceholder = () => {
      figure.replaceChildren(initialsPlaceholder(member));
      figure.classList.add('is-placeholder');
    };

    if (member.photo) {
      const img = document.createElement('img');
      img.src = member.photo;
      img.alt = 'Portrait of ' + member.name;
      img.width = 480;
      img.height = 600;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', showPlaceholder, { once: true });
      figure.appendChild(img);
    } else {
      showPlaceholder();
    }
    return figure;
  }

  function buildCard(member) {
    const card = document.createElement('article');
    card.className = 'team-card';
    card.setAttribute('role', 'listitem');

    card.appendChild(buildPortrait(member));

    const body = document.createElement('div');
    body.className = 'team-body';

    const heading = document.createElement('div');
    heading.className = 'team-heading';

    const name = document.createElement('h3');
    name.textContent = member.name;

    const title = document.createElement('p');
    title.className = 'team-role';
    title.textContent = member.title;

    const identity = document.createElement('div');
    identity.className = 'team-id';
    identity.append(name, title);

    heading.appendChild(identity);

    if (member.linkedin) {
      const link = document.createElement('a');
      link.className = 'team-linkedin';
      link.href = member.linkedin;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', member.name + ' on LinkedIn (opens in a new tab)');
      link.innerHTML = LINKEDIN_ICON;
      heading.appendChild(link);
    }

    const bio = document.createElement('p');
    bio.className = 'team-bio';
    bio.textContent = member.bio;

    body.append(heading, bio);

    if (member.expertise && member.expertise.length) {
      const list = document.createElement('ul');
      list.className = 'team-tags';
      for (const skill of member.expertise) {
        const item = document.createElement('li');
        item.textContent = skill;
        list.appendChild(item);
      }
      body.appendChild(list);
    }

    card.appendChild(body);
    return card;
  }

  function renderTeam() {
    const grid = document.querySelector('#team-grid');
    if (!grid) return;
    const fragment = document.createDocumentFragment();
    for (const member of TEAM) fragment.appendChild(buildCard(member));
    grid.replaceChildren(fragment);
  }

  /* ------------------------------------------------------------------
     Navigation, menu, footer year
     ------------------------------------------------------------------ */
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#site-nav');
  const closeMenu = () => {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
    nav.classList.remove('is-open');
  };
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const opening = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(opening));
      toggle.setAttribute('aria-label', opening ? 'Close navigation' : 'Open navigation');
      nav.classList.toggle('is-open', opening);
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
    window.matchMedia('(min-width: 791px)').addEventListener('change', closeMenu);
  }

  const year = document.querySelector('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  renderTeam();
})();
