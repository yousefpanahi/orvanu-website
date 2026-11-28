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
     Selected Product & Operations Experience — single source of truth.
     These are initiatives from the team's previous professional product
     and operations experience, NOT ORVANU client engagements. Images live
     in public/assets/experience/ with neutral filenames (no brand names).
     Do not publish unconfirmed outcome metrics; only report figures the
     owner has confirmed. Withheld figures are intentionally omitted.
     To add a project: append an entry below with a unique `id`.
     ------------------------------------------------------------------ */
  const PROJECTS = [
    {
      id: 'yard-management',
      num: '01',
      title: 'Digital Yard Management',
      category: 'Logistics Technology / Warehouse Management',
      summary: 'Designed a digital yard management solution to streamline seller check-in and warehouse arrival processes. The system digitizes ticketing workflows, improves operational visibility, and helps optimize inbound warehouse operations.',
      tags: ['Logistics', 'Warehouse Management', 'Process Automation', 'Digital Operations'],
      image: 'assets/experience/project-yard-management.jpg',
      alt: 'Driver using a self-service digital check-in kiosk at a warehouse entrance',
      challenge: 'Seller check-in and warehouse arrival relied on manual, paper-based processes that limited visibility across inbound operations.',
      solution: 'A digital yard management solution that digitizes seller ticketing and arrival workflows, giving operations teams clearer visibility across distribution hubs.',
      capabilities: ['Digital check-in', 'Seller ticketing', 'Warehouse arrival management', 'Operational workflow optimization'],
      outcome: ''
    },
    {
      id: 'single-item',
      num: '02',
      title: 'Single-Item Order Optimization',
      category: 'E-commerce / Fulfillment Optimization',
      summary: 'Introduced a fulfillment capability to improve the identification and processing of single-item orders across distribution hubs. The solution reduced unnecessary fulfillment steps, optimized warehouse workflows, and improved operational efficiency.',
      tags: ['E-commerce', 'Fulfillment', 'Order Management', 'Process Optimization'],
      image: 'assets/experience/project-single-item.jpg',
      alt: 'Warehouse operative sealing a parcel for dispatch',
      challenge: 'Single-item orders were harder to identify and were handled through the same multi-step process as larger orders, adding unnecessary handling.',
      solution: 'A fulfillment capability that recognises single-item orders and routes them through a streamlined processing path across distribution hubs.',
      capabilities: ['Single-item order recognition', 'Hub fulfillment optimization', 'Order processing improvements', 'Operational cost optimization'],
      outcome: ''
    },
    {
      id: 'driver-analytics',
      num: '03',
      title: 'Driver & Delivery Partner Incentive Dashboard',
      category: 'Business Intelligence / Delivery Technology',
      summary: 'Developed a performance and incentive management dashboard for drivers and delivery partners. The solution provided visibility into operational KPIs, individual performance, and incentive progress, supporting greater transparency and improved performance management.',
      tags: ['Business Intelligence', 'Dashboard Development', 'Performance Management', 'Last-Mile Delivery'],
      image: 'assets/experience/project-driver-analytics.jpg',
      alt: 'Driver performance analytics dashboard showing activity KPIs',
      challenge: 'Drivers and delivery partners had limited visibility into their own performance against incentive targets.',
      solution: 'A performance and incentive dashboard that surfaces operational KPIs, individual performance, and incentive progress in one place.',
      capabilities: ['Performance dashboards', 'KPI monitoring', 'Incentive management', 'Delivery partner analytics'],
      outcome: ''
    },
    {
      id: 'scheduled-delivery',
      num: '04',
      title: 'Scheduled Delivery Business Line',
      category: 'Logistics · Product ecosystem',
      summary: 'Led the launch of a new delivery model for a major digital platform with 50+ million active users, expanding from on-demand into scheduled delivery. Built from 0 to 1 as a connected ecosystem — customer panel, admin panel, rider app, and warehouse app — designed to scale toward 1 million daily orders.',
      tags: ['0→1 product launch', 'Logistics tech', 'Scheduled delivery', 'Marketplace operations'],
      image: 'assets/experience/scheduled-delivery.jpg',
      alt: 'Illustrative connected delivery platform ecosystem',
      challenge: 'Expanding a major on-demand platform into scheduled delivery required building a connected product ecosystem from 0 to 1.',
      solution: 'Launched a scheduled-delivery business line as a connected ecosystem — customer panel, admin panel, rider app, and warehouse app — designed to scale toward 1 million daily orders.',
      capabilities: ['0→1 product launch', 'Customer panel', 'Admin panel', 'Rider app', 'Warehouse app', 'Marketplace operations'],
      outcome: ''
    },
    {
      id: 'quality-control',
      num: '05',
      title: 'Inbound Receiving & Quality Control',
      category: 'Warehouse Technology / Quality Management',
      summary: 'Improved inbound receiving workflows through structured inspection checklists based on product brands and categories. The solution aimed to improve inspection consistency, support more accurate rejection decisions, and strengthen warehouse quality control.',
      tags: ['Quality Control', 'Warehouse Management', 'Supply Chain', 'Process Improvement'],
      image: 'assets/experience/project-quality-control.jpg',
      alt: 'Warehouse inspector scanning an inbound material with a handheld scanner',
      challenge: 'Inbound inspection depended on inconsistent, ad-hoc checks, making rejection decisions hard to standardise.',
      solution: 'Structured receiving checklists organised by product brand and category to make inspection more consistent.',
      capabilities: ['Structured receiving checklists', 'Brand and product-category inspection', 'Rejection accuracy', 'Inbound workflow optimization'],
      outcome: ''
    },
    {
      id: 'proof-of-delivery',
      num: '06',
      title: 'OTP-Based Proof of Delivery',
      category: 'Last-Mile Delivery / Digital Verification',
      summary: 'Led the end-to-end launch of an OTP-based Proof of Delivery solution. Customers were required to provide a five-digit SMS verification code before parcel handover, improving delivery security, traceability, and dispute resolution.',
      tags: ['Proof of Delivery', 'Last-Mile Delivery', 'Authentication', 'Customer Experience'],
      image: 'assets/experience/project-proof-of-delivery.jpg',
      alt: 'Mobile proof-of-delivery flow showing SMS code entry, parcel photo capture, and signature',
      challenge: 'Parcel handover needed a verifiable confirmation to reduce disputes and improve traceability.',
      solution: 'An OTP-based Proof of Delivery flow requiring a five-digit SMS code before handover, backed by photo capture and signature.',
      capabilities: ['SMS verification', 'Five-digit OTP authentication', 'Secure parcel handover', 'Digital delivery confirmation', 'Delivery traceability'],
      outcome: '98% Proof of Delivery compliance (reported).'
    },
    {
      id: 'dark-store',
      num: '07',
      title: 'Dark Store Fulfillment for Quick Commerce',
      category: 'Quick Commerce / Fulfillment Technology',
      summary: 'Led the product launch of fulfillment capabilities across 12 dark stores, enabling quick-commerce grocery operations and supporting deliveries within 45 minutes. Coordinated cross-functional execution across operations, engineering, and supply chain teams to support scalable fulfillment.',
      tags: ['Quick Commerce', 'E-commerce', 'Dark Stores', 'Fulfillment', 'Product Management'],
      image: 'assets/experience/project-dark-store.jpg',
      alt: 'Dark-store grocery fulfillment team picking and packing orders',
      challenge: 'Quick-commerce grocery needed a fulfilment model that could operate from urban micro-fulfilment sites and meet tight delivery windows.',
      solution: 'Launched fulfilment capabilities across dark stores, coordinating operations, engineering, and supply-chain teams.',
      capabilities: ['Dark store fulfillment', 'Quick-commerce operations', 'Order processing', 'Cross-functional product delivery', 'Fulfillment scalability'],
      outcome: '12 dark stores enabled · 45-minute delivery target (reported).'
    }
  ];

  const PROJECT_BY_ID = PROJECTS.reduce((map, project) => {
    map[project.id] = project;
    return map;
  }, {});

  function makeEl(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  const ARROW_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>';

  function buildProjectCard(project) {
    const card = makeEl('article', 'project-card');
    card.setAttribute('role', 'listitem');

    const media = makeEl('div', 'project-media');
    const img = document.createElement('img');
    img.src = project.image;
    img.alt = project.alt;
    img.width = 1120;
    img.height = 700;
    img.loading = 'lazy';
    img.decoding = 'async';
    media.appendChild(img);
    card.appendChild(media);

    const body = makeEl('div', 'project-body');
    body.appendChild(makeEl('span', 'project-cat', project.category));
    body.appendChild(makeEl('h4', 'project-title', project.title));
    body.appendChild(makeEl('p', 'project-summary', project.summary));

    const tagList = makeEl('ul', 'project-tags');
    for (const tag of project.tags) tagList.appendChild(makeEl('li', null, tag));
    body.appendChild(tagList);

    const button = makeEl('button', 'project-open', 'Explore Project ');
    button.type = 'button';
    button.dataset.project = project.id;
    button.setAttribute('aria-label', 'Explore project: ' + project.title);
    button.insertAdjacentHTML('beforeend', ARROW_SVG);
    body.appendChild(button);

    card.appendChild(body);
    return card;
  }

  function renderProjects() {
    const grid = document.querySelector('#project-grid');
    if (!grid) return;
    const fragment = document.createDocumentFragment();
    for (const project of PROJECTS) fragment.appendChild(buildProjectCard(project));
    grid.replaceChildren(fragment);
  }

  function buildDialogContent(project) {
    const fragment = document.createDocumentFragment();
    const addSection = (heading, text) => {
      fragment.appendChild(makeEl('h4', null, heading));
      fragment.appendChild(makeEl('p', null, text));
    };
    addSection('Overview', project.summary);
    addSection('Business challenge', project.challenge);
    addSection('Solution', project.solution);

    fragment.appendChild(makeEl('h4', null, 'Key capabilities'));
    const list = document.createElement('ul');
    for (const capability of project.capabilities) list.appendChild(makeEl('li', null, capability));
    fragment.appendChild(list);

    if (project.outcome) addSection('Reported outcome', project.outcome);

    const link = makeEl('a', 'project-dialog-link', 'Explore related capabilities \u2192');
    link.href = '#capabilities';
    fragment.appendChild(link);
    return fragment;
  }

  const projectDialog = document.querySelector('#project-dialog');
  let lastProjectTrigger = null;

  function openProjectDialog(project, trigger) {
    if (!projectDialog) return;
    lastProjectTrigger = trigger || null;
    const img = projectDialog.querySelector('#project-dialog-img');
    const category = projectDialog.querySelector('#project-dialog-category');
    const title = projectDialog.querySelector('#project-dialog-title');
    const content = projectDialog.querySelector('#project-dialog-content');
    if (img) { img.src = project.image; img.alt = project.alt; }
    if (category) category.textContent = project.category;
    if (title) title.textContent = project.num + ' / ' + project.title;
    if (content) { content.replaceChildren(); content.appendChild(buildDialogContent(project)); }
    if (typeof projectDialog.showModal === 'function') projectDialog.showModal();
    else projectDialog.setAttribute('open', '');
  }

  if (projectDialog) {
    const grid = document.querySelector('#project-grid');
    if (grid) {
      grid.addEventListener('click', (event) => {
        const button = event.target.closest('.project-open');
        if (!button) return;
        const project = PROJECT_BY_ID[button.dataset.project];
        if (project) openProjectDialog(project, button);
      });
    }
    const closeButton = projectDialog.querySelector('#project-dialog-close');
    if (closeButton) closeButton.addEventListener('click', () => projectDialog.close());
    projectDialog.addEventListener('click', (event) => {
      if (event.target === projectDialog) projectDialog.close();
    });
    projectDialog.addEventListener('close', () => {
      if (lastProjectTrigger) { lastProjectTrigger.focus(); lastProjectTrigger = null; }
    });
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
  renderProjects();
})();
