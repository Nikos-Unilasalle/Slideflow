(() => {
  // Minimal config as a fallback if theme.json fails
  const MINIMAL_CONFIG = {
    background: "#0b0c10", textColor: "#e5e7eb", accentColor: "#64ffda", boldColor: "#ffffff", titleColor: "#ffffff",
    titleFont: "sans-serif", bodyFont: "sans-serif", titleSize: 64, subtitleSize: 28, bodySize: 18,
    lineHeight: 1.3, gutter: 24, speed: 650, easing: "expo", vignette: true, vignetteStrength: 0.45,
    imageFit: "cover", googleFonts: [], logoUrl: "presentation/img/logo.png", logoSize: 120, logoOpacity: 1, logoCorner: "tl",
    logoMargin: 16, logoRadius: 8, logoShadow: true, imageSide: "left", showFoldImage: true, foldImageOpacity: 1
  };

  // Configure marked to allow raw HTML and breaks
  marked.setOptions({
    gfm: true,
    breaks: true
  });

  const keyword = {
    name: 'keyword',
    level: 'inline',
    start(src) { return src.indexOf('{'); },
    tokenizer(src, tokens) {
      const rule = /^\{([^}]+)\}/;
      const match = rule.exec(src);
      if (match) {
        return {
          type: 'keyword',
          raw: match[0],
          text: match[1].trim()
        };
      }
    },
    renderer(token) {
      return `<span class="keyword">${token.text}</span>`;
    }
  };

  marked.use({ extensions: [keyword] });

  mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });

  // Configure DOMPurify to allow SVG elements and attributes for Mermaid diagrams
  DOMPurify.setConfig({
    ADD_TAGS: ['svg', 'path', 'g', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan', 'span', 'div'],
    ADD_ATTR: ['viewBox', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'class', 'style', 'd', 'transform', 'x', 'y', 'r', 'cx', 'cy', 'x1', 'y1', 'x2', 'y2', 'points', 'font-family', 'font-size', 'text-anchor', 'dominant-baseline']
  });

  // DOM
  const btnSave = document.getElementById('btn-save');
  const saveThemeBtn = document.getElementById('save-theme-btn');     // New
  const exportHtmlBtn = document.getElementById('export-html-btn'); // New
  const zoomSlider = document.getElementById('zoom-slider');
  const vMarginSlider = document.getElementById('v-margin-slider');
  const hMarginSlider = document.getElementById('h-margin-slider');
  // const invertLayoutBtn = document.getElementById('invert-layout-btn'); // Commented out

  const stage = document.getElementById('stage');
  const pos = document.getElementById('pos');
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');

  const openPanelText = document.getElementById('openPanelText');
  const panelText = document.getElementById('panel-text');
  const closePanelText = document.getElementById('closePanelText');
  const openPanelEffects = document.getElementById('openPanelEffects');
  const panelEffects = document.getElementById('panel-effects');
  const closePanelEffects = document.getElementById('closePanelEffects');

  const vignette = document.getElementById('vignette');
  const logoImg = document.getElementById('brandLogo');
  const foldImg = document.getElementById('foldImage');

  const P1 = [document.getElementById('B1-0'), document.getElementById('B1-1')];
  const P2 = [document.getElementById('B2-0'), document.getElementById('B2-1')];
  const allBuffers = [...P1, ...P2];

  // Panel inputs
  const p = {
    background: document.getElementById('p_background'),
    titleColor: document.getElementById('p_titleColor'),
    textColor:  document.getElementById('p_textColor'),
    accentColor: document.getElementById('p_accentColor'),
    boldColor: document.getElementById('p_boldColor'),
    imageSide: document.getElementById('p_imageSide'),
    titleSize: document.getElementById('p_titleSize'),
    subtitleSize: document.getElementById('p_subtitleSize'),
    bodySize:   document.getElementById('p_bodySize'),
    lineHeight: document.getElementById('p_lineHeight'),
    gutter:     document.getElementById('p_gutter'),
    speed:      document.getElementById('p_speed'),
    vignetteStrength: document.getElementById('p_vignetteStrength'),
    foldImageOpacity: document.getElementById('p_foldImageOpacity'),
    logoSize:   document.getElementById('p_logoSize'),
    logoOpacity: document.getElementById('p_logoOpacity'),
    logoCorner: document.getElementById('p_logoCorner'),
    logoMargin: document.getElementById('p_logoMargin'),
    logoRadius: document.getElementById('p_logoRadius'),
    logoShadow: document.getElementById('p_logoShadow'),
    gf_title_family: document.getElementById('gf_title_family'),
    gf_body_family: document.getElementById('gf_body_family')
  };

  let slides = [];
  let cfg = { ...MINIMAL_CONFIG };
  let idx = 0;
  let active = 0;
  let busy = false;

  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function isHttp(s){ return /^(https?:)?\/\//i.test(s); }
  function isData(s){ return /^data:/i.test(s); }
  function resolveSrc(s){
    if(!s) return s;
    if(isHttp(s)||isData(s)) return s;
    const clean = String(s).replace(/^\.\//,'').replace(/^\/+/,'');
    return 'presentation/img/' + clean;
  }


  function extractLeadingVShift(lines){
    let totalUnits = 0; let i = 0;
    while (i < lines.length){
      const l = lines[i];
      if (/^#\s+/.test(l) || /^##\s+/.test(l)) break;
      if (/^\s*$/.test(l)) { totalUnits += 1; i++; continue; }
      break;
    }
    return { totalUnits, startIndex: i };
  }


  function mdToHtmlWithVspace(mdText, gutterPx){
    // Convert custom [filename.ext] syntax to standard Markdown image syntax
    // Store code blocks temporarily
    const codeBlocks = [];
    let codeBlockIndex = 0;
    const codeBlockPlaceholder = "<!--CODE_BLOCK_PLACEHOLDER_";

    // Regex to find fenced code blocks (```language\ncode\n```)
    const preprocessedWithCodePlaceholders = mdText.replace(/```[\s\S]*?```/g, (match) => {
        const placeholder = codeBlockPlaceholder + (codeBlockIndex++) + "-->";
        codeBlocks.push({ placeholder: placeholder, content: match });
        return placeholder;
    });

    // Convert custom [filename.ext] syntax to standard Markdown image syntax
    let preprocessedMd = preprocessedWithCodePlaceholders.replace(/\[([^\]]+)\](?!\()/g, (match, filename) => {
        return `![](${filename.trim()})`;
    });

    // Restore code blocks
    for (const block of codeBlocks) {
        preprocessedMd = preprocessedMd.replace(block.placeholder, block.content);
    }

    const lines = preprocessedMd.split("\n");
    const out = [];
    let run = 0; // Compteur pour les lignes vides consécutives (pour VSPACE)
    let wasInBlockquote = false; // Suivi de l'état : étions-nous dans une citation ?

    for (const l of lines){
      const isQuoteLine = l.trim().startsWith('>');

      // Si c'est une ligne vide, on incrémente le compteur VSPACE
      if (/^\s*$/.test(l)) {
        run += 1;
        wasInBlockquote = false; // Une ligne vide termine toujours une citation
        continue;
      }

      // Si ce n'est PAS une ligne vide :
      // 1. On vérifie si on sort d'une citation sans ligne vide
      if (wasInBlockquote && !isQuoteLine) {
        // C'est le cas critique ! On doit insérer une VRAIE ligne vide
        // que Marked pourra interpréter pour fermer le blockquote.
        out.push('');
      }

      // 2. On traite les lignes vides accumulées (VSPACE)
      if (run > 0){
        out.push(`<!--VSPACE:${run}-->`);
        run = 0;
      }

      // 3. On ajoute la ligne de contenu actuelle
      out.push(l);

      // 4. On met à jour notre état pour la prochaine itération
      wasInBlockquote = isQuoteLine;
    }
    // S'il reste des lignes vides à la fin du fichier
    if (run > 0) out.push(`<!--VSPACE:${run}-->`);

    const html = marked.parse(out.join("\n"));

    const parsedGutter = Number(gutterPx);
    const baseHeight = Math.max(Number.isFinite(parsedGutter) ? parsedGutter : 24, 0);
    const spacedHtml = html.replace(/<!--VSPACE:(\d+)-->/g, (_, n) => {
      const count = Math.max(parseInt(n, 10) || 0, 0);
      if (!count) return '';
      const spacer = `<div class="vspace" style="height:${baseHeight}px"></div>`;
      return spacer.repeat(count);
    });
    return spacedHtml;
  }

  function injectGoogleFonts(families){
    if(!families||!families.length) return;
    const id='gfonts';
    let link=document.getElementById(id);
    const famQuery=families.map(f => 'family='+f.trim().replace(/\s+/g,'+')).join('&');
    const href='https://fonts.googleapis.com/css2?'+famQuery+'&display=swap';
    if(!link){ link=document.createElement('link'); link.id=id; link.rel='stylesheet'; document.head.appendChild(link); }
    link.href=href;
  }

  function gf_sanitizeFamily(raw){
    const s = String(raw||'').trim();
    return s.replace(/\s+/g, ' ').replace(/[^a-zA-Z0-9\s-]/g,'');
  }

  function gf_buildQuery(family, italicFlag){
      if (!family) return '';
      const fam = gf_sanitizeFamily(family);
      if (String(italicFlag) === '1') {
          return `${fam}:ital@1`;
      }
      return fam;
  }

  function applySimpleFonts(){
    const titleFam = gf_sanitizeFamily((p.gf_title_family && p.gf_title_family.value) || '');
    const bodyFam  = gf_sanitizeFamily((p.gf_body_family  && p.gf_body_family.value)  || '');
    const families = [];
    const titQuery = gf_buildQuery(titleFam, '0'); // Always '0' as italic is removed
    const bodQuery = gf_buildQuery(bodyFam, '0');  // Always '0' as italic is removed
    if(titQuery) families.push(titQuery);
    if(bodQuery && bodQuery!==titQuery) families.push(bodQuery);

    if(families.length){
      injectGoogleFonts(families);
      cfg.googleFonts = families;
    }
    if(titleFam) cfg.titleFont = `${titleFam}, sans-serif`; // Default to sans-serif
    if(bodyFam)  cfg.bodyFont  = `${bodyFam}, sans-serif`;  // Default to sans-serif

    applyConfig();
    applySlideColors(slides[idx]||{});
    const textPane = (cfg.imageSide === 'left') ? P2[active] : P1[active];
    setContentForText(textPane, slides[idx]||{title:'',subtitle:'',body:''});
    applySlideCustomStyles(slides[idx]||{}, textPane);
  }


  function applyConfig(){
    const root=document.documentElement;
    root.style.setProperty('--bg', cfg.background);
    root.style.setProperty('--title-color', cfg.titleColor);
    root.style.setProperty('--text', cfg.textColor);
    root.style.setProperty('--accent', cfg.accentColor);
    root.style.setProperty('--bold-text-color', cfg.boldColor);
    root.style.setProperty('--title-size', cfg.titleSize+'px');
    root.style.setProperty('--subtitle-size', cfg.subtitleSize+'px');
    root.style.setProperty('--body-size', cfg.bodySize+'px');
    root.style.setProperty('--line', cfg.lineHeight);
    root.style.setProperty('--gutter', cfg.gutter+'px');
    root.style.setProperty('--speed', cfg.speed+'ms');
    root.style.setProperty('--easing', cfg.easing==='linear'?'linear':'cubic-bezier(0.16,1,0.3,1)');
    root.style.setProperty('--title-font', cfg.titleFont);
    root.style.setProperty('--body-font', cfg.bodyFont);

    vignette.style.background = cfg.vignette
      ? `radial-gradient(ellipse at center, rgba(0,0,0,0) ${Math.round((1-cfg.vignetteStrength)*100)}%, rgba(0,0,0,${cfg.vignetteStrength}) 100%)`
      : 'none';

    applyLogo();
  }

  function applyLogo(){
    if(!cfg.logoUrl){ logoImg.hidden=true; return; }
    logoImg.src = cfg.logoUrl; logoImg.hidden=false; logoImg.style.opacity=String(cfg.logoOpacity);
    logoImg.style.width = (cfg.logoSize||120)+'px';
    const m = (cfg.logoMargin||16)+'px';
    logoImg.style.top=''; logoImg.style.right=''; logoImg.style.left=''; logoImg.style.bottom='';
    if(cfg.logoCorner==='tr'){ logoImg.style.top=m; logoImg.style.right=m; }
    if(cfg.logoCorner==='tl'){ logoImg.style.top=m; logoImg.style.left=m; }
    if(cfg.logoCorner==='br'){ logoImg.style.bottom=m; logoImg.style.right=m; }
    if(cfg.logoCorner==='bl'){ logoImg.style.bottom=m; logoImg.style.left=m; }

    logoImg.style.borderRadius = `${cfg.logoRadius || 0}px`;
    logoImg.style.filter = cfg.logoShadow ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))' : 'none';
  }

  function parseSlides(md){
    if (!md) return [];
    const parts = md
      .split(/^===\s*$\n/m)
      .map(part => part.replace(/\r/g, ''))
      .filter(part => part.trim().length > 0);
    return parts.map(parseSlide);
  }

  // Fichier : app.js

  function parseSlide(chunk){
    // 1. Initialiser toutes les variables, y compris 'tags'
    let image = "", invert = false, zoom = 1, originalImage = "", v_margin = 0, h_margin = 0, tags = [];
    let rawContent = chunk; // Par défaut, le contenu brut est tout le chunk

    const fm = chunk.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

    // 2. S'il y a du front-matter, on le traite dans un SEUL bloc try...catch
    if(fm){
      try{
        const data = jsyaml.load(fm[1]) || {};

        // Extraction de toutes les données
        originalImage = data.image || data.img || data.cover || "";
        image = resolveSrc(originalImage);

        const themeStr = String((data.theme || data.mode || '') || '').toLowerCase();
        invert = !!(data.invert || data.light || themeStr === 'light');

        zoom = parseFloat(data.zoom) || 1;
        v_margin = parseInt(data.v_margin, 10) || 0;
        h_margin = parseInt(data.h_margin, 10) || 0;

        // Logique pour les tags
        const tagsString = (data.tags || '').trim();
        if (tagsString) {
          tags = tagsString.split(',').map(tag => tag.trim());
        }

        // On met à jour rawContent pour qu'il ne contienne QUE le texte APRÈS le front-matter
        rawContent = chunk.slice(fm[0].length);

      } catch(e) {
        console.error("Failed to parse frontmatter", e);
      }
    }

    // 3. Le reste de la fonction traite le 'rawContent' qui a été nettoyé
    const lines = rawContent.split(/\n/);
    const { totalUnits: vShiftUnits, startIndex } = extractLeadingVShift(lines);
    const rest = lines.slice(startIndex);

    let title = "", subtitle = "";
    const tIdx = rest.findIndex(l=> /^#\s+/.test(l)); if(tIdx!==-1){ title = rest[tIdx].replace(/^#\s+/, '').trim(); rest.splice(tIdx,1); }
    const stIdx = rest.findIndex(l=> /^##\s+/.test(l)); if(stIdx!==-1){ subtitle = rest[stIdx].replace(/^##\s+/, '').trim(); rest.splice(stIdx,1); }

    const body = rest.join('\n');

    // 4. On retourne TOUTES les données, y compris les tags
    return { image, originalImage, title, subtitle, body, invert, vShiftUnits, zoom, v_margin, h_margin, rawContent, tags };
  }
  function slideIsImageOnly(s){ return (!!s.image) && (!s.title?.trim()) && (!s.subtitle?.trim()) && (!s.body?.trim()); }
  function slideIsContentOnly(s){ return (!s.image) && (s.title?.trim() || s.subtitle?.trim() || s.body?.trim()); }

  function applyImageZoom(s, dom) {
    const bodyEl = dom.querySelector('.body');
    if (!bodyEl) return;
    bodyEl.querySelectorAll('img').forEach(img => {
      if (s.zoom && s.zoom !== 1) {
        const inverseScale = 1 / s.zoom;
        img.style.transform = `scale(${inverseScale})`;
        img.style.transformOrigin = 'top left';
      } else {
        img.style.transform = '';
      }
    });
  }

  function renderSpecialBlocks(element) {
    // Mermaid diagrams
    const mermaidBlocks = element.querySelectorAll('pre code.language-mermaid');
    if (mermaidBlocks.length === 0) return Promise.resolve();

    mermaidBlocks.forEach(block => {
      const container = document.createElement('div');
      container.classList.add('mermaid');
      container.textContent = block.textContent;
      block.parentElement.replaceWith(container);
    });

    // Let mermaid find and render the diagrams
    return mermaid.run({
        nodes: element.querySelectorAll('.mermaid')
    }).catch(e => {
      console.error("Mermaid run error:", e);
    });
  }

  function setContentForText(dom, s){
  dom.innerHTML = '<div class="title"></div><div class="subtitle"></div><div class="body md"></div>';
  const basePad = 40;
  const extra = (s.vShiftUnits || 0) * (cfg.gutter || 24);
  if (dom.classList.contains('center')) dom.style.paddingTop = basePad + 'px';
  else dom.style.paddingTop = (basePad + extra) + 'px';

  const titleEl = dom.querySelector('.title');
  const subtitleEl = dom.querySelector('.subtitle');
  const bodyEl = dom.querySelector('.body');

  titleEl.textContent = s.title || '';
  subtitleEl.textContent = s.subtitle || '';

  const safeHtml = DOMPurify.sanitize(mdToHtmlWithVspace(s.body || '', cfg.gutter));

  bodyEl.innerHTML = safeHtml;

    dom.querySelectorAll('.body img').forEach(img=>{
      const src=img.getAttribute('src')||'';
      if(!isHttp(src) && !isData(src)) img.setAttribute('src', resolveSrc(src));
    });

    applyImageZoom(s, dom); // Apply initial image zoom

    const renderPromise = renderSpecialBlocks(bodyEl);
    dom.__renderPromise = renderPromise;
    return renderPromise;
  }

  function setContentForImage(dom, s){
    dom.innerHTML = '';
    if (s.image) {
      dom.style.backgroundImage = `url('${s.image}')`;
    } else {
      dom.style.backgroundImage = 'none';
    }
  }

  function applySlideCustomStyles(s, dom) {
    if (!s || !dom) return;
    dom.style.marginTop = `${s.v_margin || 0}px`;
    dom.style.marginLeft = `${s.h_margin || 0}px`;
  }


  function applySlideColors(s){
    if (!s) return;
    const root=document.documentElement;
    const invert= !!s.invert;
    if(invert){ root.style.setProperty('--bg', cfg.textColor); root.style.setProperty('--text', cfg.background); }
    else { root.style.setProperty('--bg', cfg.background); root.style.setProperty('--text', cfg.textColor); }
  }

  function slideHasContent(s){ return !!(s && (s.title?.trim() || s.subtitle?.trim() || s.body?.trim())); }

function updateFoldOverlayForSlide(s){
  if (!s) return;
  const hasImg = !!s.image;
  const hasContent = slideHasContent(s);
  const on = !!(cfg.showFoldImage && hasImg && hasContent);
  if (!foldImg) return;
  foldImg.hidden = !on;
  foldImg.style.opacity = on ? String(clamp(cfg.foldImageOpacity, 0, 1)) : '0';
}

  function show(i,dir=1){
    if(busy) return; busy=true; i = clamp(i,0,slides.length-1);
    const nextBuf = 1 - active;
    const s = slides[i];

    const tagsContainer = document.getElementById('tags');
    if (tagsContainer) {
      tagsContainer.innerHTML = '';
      if (s.tags && s.tags.length > 0) {
        const tagsWrapper = document.createElement('div');
        tagsWrapper.className = 'tags-container';
        s.tags.forEach(tag => {
          const tagElement = document.createElement('span');
          tagElement.className = 'tag-item';
          tagElement.textContent = tag;
          tagsWrapper.appendChild(tagElement);
        });
        tagsContainer.appendChild(tagsWrapper);
      }
    }

    const imagePane = (cfg.imageSide === 'left') ? P1[0].parentElement : P2[0].parentElement;
    const textPane = (cfg.imageSide === 'left') ? P2[0].parentElement : P1[0].parentElement;
    const imageBuffers = (cfg.imageSide === 'left') ? P1 : P2;
    const textBuffers = (cfg.imageSide === 'left') ? P2 : P1;

    const nextImageBuffer = imageBuffers[nextBuf];
    const nextTextBuffer = textBuffers[nextBuf];
    const activeImageBuffer = imageBuffers[active];
    const activeTextBuffer = textBuffers[active];

    allBuffers.forEach(b => { b.className = 'pane-buffer'; b.style.transform = ''; });
    stage.style.gridTemplateColumns = '1fr 1fr';
    P1[0].parentElement.style.display = 'block';
    P2[0].parentElement.style.display = 'block';

    const contentOnly = slideIsContentOnly(s);
    const imageOnly = slideIsImageOnly(s);
    if (imageOnly) {
        stage.style.gridTemplateColumns = '1fr';
        textPane.style.display = 'none';
    } else if (contentOnly) {
        stage.style.gridTemplateColumns = '1fr';
        imagePane.style.display = 'none';
    }

    applySlideColors(s);
    nextImageBuffer.classList.add('image-pane');
    nextTextBuffer.classList.add('text-pane');
    if (contentOnly) nextTextBuffer.classList.add('center');

    setContentForImage(nextImageBuffer, s);
    setContentForText(nextTextBuffer, s);

    nextTextBuffer.style.transform = `scale(${s.zoom || 1})`;
    applySlideCustomStyles(s, nextTextBuffer);
    zoomSlider.value = s.zoom || 1;
    vMarginSlider.value = s.v_margin || 0;
    hMarginSlider.value = s.h_margin || 0;

    updateFoldOverlayForSlide(s);

    allBuffers.forEach(b => b.style.zIndex = 1);
    nextImageBuffer.style.zIndex = 2;
    nextTextBuffer.style.zIndex = 2;

    // Set initial positions for transition
    nextImageBuffer.style.transform = `translateY(${dir * 100}%)`;
    nextTextBuffer.style.transform = `translateX(${dir * 100}%)`;
    nextImageBuffer.style.opacity = 1;
    nextTextBuffer.style.opacity = 1;

    requestAnimationFrame(() => {
        // Animate outgoing elements
        activeImageBuffer.style.transform = `translateY(${-dir * 100}%)`;
        activeTextBuffer.style.transform = `translateX(${-dir * 100}%)`;
        activeImageBuffer.style.opacity = 0;
        activeTextBuffer.style.opacity = 0;

        // Animate incoming elements
        nextImageBuffer.style.transform = 'translateY(0)';
        nextTextBuffer.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
        idx = i;
        active = nextBuf;
        busy = false;
        updateHUD();
        // Reset transforms for the now hidden elements
        activeImageBuffer.style.transform = '';
        activeTextBuffer.style.transform = '';
    }, cfg.speed + 50);
  }

  function updateHUD(){ pos.textContent = `${idx+1}/${slides.length||1}`; }

  (function initWheel(){
    let acc=0,last=0; const threshold=120;
    window.addEventListener('wheel', e=>{
      const cooldown=Math.max(250,cfg.speed+100);
      const now=Date.now(); if(now-last<cooldown) return;
      acc+=e.deltaY;
      if(Math.abs(acc)>threshold){ last=now; const d=acc>0?1:-1; acc=0; show(idx+d,d); }
    }, {passive:true});
  })();
  prev.addEventListener('click', ()=>show(idx-1,-1));
  next.addEventListener('click', ()=>show(idx+1,1));

  function toggleUI(){ document.body.classList.toggle('hide-ui'); }
  function clearCovers(){ document.body.classList.remove('cover-black','cover-white'); }
  function toggleBlack(){ const b=document.body; if(b.classList.contains('cover-black')) b.classList.remove('cover-black'); else { b.classList.add('cover-black'); b.classList.remove('cover-white'); } }
  function toggleWhite(){ const b=document.body; if(b.classList.contains('cover-white')) b.classList.remove('cover-white'); else { b.classList.add('cover-white'); b.classList.remove('cover-black'); } }

  function fsElement(){ return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement; }
  function enterFullscreen(el=document.documentElement){ const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen; if(req) return req.call(el); }
  function exitFullscreen(){ const ex = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen; if(ex) return ex.call(document); }
  async function toggleFullscreen(){ try{ if(fsElement()) await exitFullscreen(); else await enterFullscreen(); }catch(e){ console.warn('Fullscreen error', e); } }
  document.addEventListener('fullscreenchange', ()=>{ document.body.classList.toggle('is-fullscreen', !!fsElement()); });
  document.addEventListener('webkitfullscreenchange', ()=>{ document.body.classList.toggle('is-fullscreen', !!fsElement()); });

function setSpaceCursor(){
  document.body.style.cursor = "url('app/assets/pointer.png') 0 0, url('pointer.png') 0 0, auto";
}
function resetSpaceCursor(){ document.body.style.cursor = ""; }

function initKeyboard(){
  document.addEventListener('keydown', e=>{
    const tag = (e.target && e.target.tagName || '').toUpperCase();
    if (tag==='INPUT' || tag==='TEXTAREA' || tag==='SELECT') return;
    const k = e.key.toLowerCase();

    if (k === ' '){
      e.preventDefault();
      setSpaceCursor();
      return;
    }
    if (k==='arrowright' || k==='pagedown'){ e.preventDefault(); show(idx+1, 1); return; }
    if (k==='arrowleft'  || k==='pageup'){   e.preventDefault(); show(idx-1,-1); return; }
    if (k==='b'){ toggleBlack(); return; }
    if (k==='w'){ toggleWhite(); return; }
    if (k==='i'){ toggleUI(); return; }
    if (k==='escape'){ clearCovers(); return; }
    if (k==='f'){ toggleFullscreen(); return; }
  });

  document.addEventListener('keyup', e=>{
    if (e.key===' ' || e.code==='Space') resetSpaceCursor();
  });
  window.addEventListener('blur', ()=> resetSpaceCursor());
}
initKeyboard();

  openPanelText.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); panelText.hidden=false; });
  closePanelText.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); panelText.hidden=true; });
  openPanelEffects.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); panelEffects.hidden=false; });
  closePanelEffects.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); panelEffects.hidden=true; });

  function updateSliderValue(id, value) {
    const el = document.getElementById(id + '_val');
    if (el) el.textContent = value;
  }

  function populatePanel(){
    if(!panelText) return;

    const fields = ['titleSize', 'subtitleSize', 'bodySize', 'lineHeight', 'gutter', 'speed', 'logoSize', 'logoMargin', 'logoRadius'];

    p.background.value = (cfg.background);
    p.titleColor.value = (cfg.titleColor);
    p.textColor.value  = (cfg.textColor);
    p.accentColor.value= (cfg.accentColor);
    p.boldColor.value = (cfg.boldColor);
    p.vignetteStrength.value = cfg.vignetteStrength;
    p.foldImageOpacity.value = cfg.foldImageOpacity;
    p.logoOpacity.value= cfg.logoOpacity;
    p.logoCorner.value = cfg.logoCorner;
    p.logoShadow.checked = !!cfg.logoShadow;

    fields.forEach(f => {
        if(p[f]) {
            p[f].value = cfg[f];
            updateSliderValue('p_' + f, cfg[f]);
        }
    });

    const parseFirst = (s)=> String(s||'').split(',')[0].trim();
    if(p.gf_title_family)   p.gf_title_family.value   = parseFirst(cfg.titleFont||'') || '';
    if(p.gf_body_family)    p.gf_body_family.value    = parseFirst(cfg.bodyFont||'')  || '';
  }

function readPanelToConfig(){
  const next = {
    background: p.background.value,
    titleColor: p.titleColor.value,
    textColor:  p.textColor.value,
    accentColor:p.accentColor.value,
    boldColor: p.boldColor.value,
    titleSize:  +p.titleSize.value,
    subtitleSize:+p.subtitleSize.value,
    bodySize:   +p.bodySize.value,
    lineHeight: +p.lineHeight.value,
    gutter:     +p.gutter.value,
    speed:      +p.speed.value,
    vignette:   true,
    vignetteStrength:+p.vignetteStrength.value,
    showFoldImage: true,
    foldImageOpacity: +p.foldImageOpacity.value,
    titleFont:  cfg.titleFont,
    bodyFont:   cfg.bodyFont,
    googleFonts: cfg.googleFonts || [],
    logoSize:   +p.logoSize.value,
    logoOpacity:+p.logoOpacity.value,
    logoCorner: p.logoCorner.value,
    logoMargin: +p.logoMargin.value,
    logoRadius: +p.logoRadius.value,
    logoShadow: !!p.logoShadow.checked
  };
  cfg = {...cfg, ...next};
  applyConfig();
  applySlideColors(slides[idx]||{});
  const textPane = (cfg.imageSide === 'left') ? P2[active] : P1[active];
  setContentForText(textPane, slides[idx]||{title:'',subtitle:'',body:''});
  applySlideCustomStyles(slides[idx]||{}, textPane);
  updateFoldOverlayForSlide(slides[idx] || {});
}

  Object.values(p).forEach(el=>{
      if(!el) return;
      const eventType = (el.type === 'range' || el.type === 'text' || el.type === 'color') ? 'input' : 'change';
      el.addEventListener(eventType, e => {
        readPanelToConfig();
        if (e.target.type === 'range') {
            updateSliderValue(e.target.id, e.target.value);
        }
      });
  });


  ['gf_title_family','gf_title_fallback',
 'gf_body_family','gf_body_fallback']
  .forEach(key=>{
    if(p[key]){
      p[key].addEventListener('change', applySimpleFonts);
    }
  });

  saveThemeBtn.addEventListener('click', ()=>{
    const data={...cfg};
    delete data.markdownContent;
    const blob=new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='theme.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 500);
  });
  document.querySelectorAll('.resetTheme').forEach(button => {
    button.addEventListener('click', ()=>{
      cfg={...MINIMAL_CONFIG};
      populatePanel();
      readPanelToConfig();
    });
  });

  function boot(){
    try{
      slides = parseSlides(cfg.markdownContent);
    } catch(e){
      console.error("Failed to parse slides:", e);
      slides = [];
    }

    if(!slides.length) {
      slides = [{ rawContent: 'Erreur: Impossible de charger ou parser presentation.md', title: 'Erreur de chargement', subtitle: '', body: 'Veuillez vérifier que le fichier presentation.md existe et est correctement formaté.', zoom: 1, v_margin: 0, h_margin: 0, invert: false, originalImage: '' }];
    }

    show(0, 0);
  }

  function generateMarkdownForSave() {
    return slides.map(s => {
      let frontmatter = {};
      if (s.originalImage) frontmatter.image = s.originalImage;
      if (s.invert) frontmatter.invert = true;
      if (s.zoom && s.zoom != 1) frontmatter.zoom = Number(s.zoom.toFixed(2));
      if (s.v_margin && s.v_margin != 0) frontmatter.v_margin = s.v_margin;
      if (s.h_margin && s.h_margin != 0) frontmatter.h_margin = s.h_margin;

      let fmString = '';
      if (Object.keys(frontmatter).length > 0) {
        fmString = `---\n${jsyaml.dump(frontmatter)}---\n`;
      }

      return fmString + s.rawContent;
    }).join('\n===\n\n');
  }

  function saveFile() {
    try {
      const content = generateMarkdownForSave();
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'presentation.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const originalText = btnSave.textContent;
      btnSave.textContent = '✓ Enregistré !';
      setTimeout(() => { btnSave.textContent = originalText; }, 2000);
    } catch (e) {
      console.error("Failed to save file", e);
      alert("La sauvegarde a échoué. Voir la console pour les détails.");
    }
  }

  async function loadInitial() {
    const themePromise = fetch('presentation/theme.json')
        .then(res => res.ok ? res.json() : Promise.reject('Theme fetch failed'))
        .catch(err => {
            console.warn('Could not load theme.json, using minimal defaults.', err);
            return { ...MINIMAL_CONFIG };
        });

    const mdPromise = fetch('presentation/presentation.md')
        .then(res => res.ok ? res.text() : Promise.reject('MD fetch failed'))
        .catch(err => {
            console.error('Could not load presentation.md.', err);
            return null; // Return null on failure
        });

    const [themeConfig, mdContent] = await Promise.all([themePromise, mdPromise]);

    cfg = { ...MINIMAL_CONFIG, ...themeConfig };
    cfg.markdownContent = mdContent;

    if (cfg.googleFonts) {
        injectGoogleFonts(cfg.googleFonts);
    }

    populatePanel();
    readPanelToConfig();

    boot();
  }

  // --- Event Listeners ---
  btnSave.addEventListener('click', saveFile);

  /* invertLayoutBtn.addEventListener('click', () => {
    if (!slides[idx]) return;
    slides[idx].invert_layout = !slides[idx].invert_layout;
    const s = slides[idx];
    const inverted = isLayoutInverted(s);
    stage.classList.toggle('layout-inverted', inverted && !slideIsContentOnly(s) && !slideIsImageOnly(s));
    const textPane = inverted ? P1[active] : P2[active];
    applySlideCustomStyles(s, textPane);
  }); */

  zoomSlider.addEventListener('input', (e) => {
    if (slides[idx]) {
      const newZoom = parseFloat(e.target.value);
      slides[idx].zoom = newZoom;
      const textPane = (cfg.imageSide === 'left') ? P2[active] : P1[active];
      textPane.style.transform = `scale(${newZoom})`;
      applyImageZoom(slides[idx], textPane); // Re-apply image zoom when slider changes
    }
  });

  vMarginSlider.addEventListener('input', (e) => {
    if (slides[idx]) {
        const newValue = parseInt(e.target.value, 10);
        slides[idx].v_margin = newValue;
        const textPane = (cfg.imageSide === 'left') ? P2[active] : P1[active];
        applySlideCustomStyles(slides[idx], textPane);
    }
  });

  hMarginSlider.addEventListener('input', (e) => {
    if (slides[idx]) {
        const newValue = parseInt(e.target.value, 10);
        slides[idx].h_margin = newValue;
        const textPane = (cfg.imageSide === 'left') ? P2[active] : P1[active];
        applySlideCustomStyles(slides[idx], textPane);
    }
  });

  // --- Initial Boot ---
  loadInitial();

  exportHtmlBtn.addEventListener('click', exportToHtml);

  async function exportToHtml() {
    alert('La préparation du téléchargement commence. Le traitement des images en un seul fichier peut prendre quelques instants...');

    const waitUntil = (predicate) => new Promise(resolve => {
      const check = () => predicate() ? resolve() : requestAnimationFrame(check);
      check();
    });

    const cloneNodeWithInlineStyles = (node, options = {}) => {
      if (!node) return null;
      if (node.nodeType === Node.TEXT_NODE) {
        return document.createTextNode(node.textContent || '');
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return null;
      }

      const { removeIds = false } = options;
      const clone = node.cloneNode(false);
      if (removeIds && clone.hasAttribute('id')) clone.removeAttribute('id');

      const computed = window.getComputedStyle(node);
      const styleParts = [];
      for (const prop of computed) {
        const value = computed.getPropertyValue(prop);
        if (value) styleParts.push(`${prop}:${value};`);
      }
      if (styleParts.length) clone.setAttribute('style', styleParts.join(''));

      for (const child of node.childNodes) {
        const clonedChild = cloneNodeWithInlineStyles(child, options);
        if (clonedChild) clone.appendChild(clonedChild);
      }

      return clone;
    };

    const convertInlineImages = async (container, convertUrl) => {
      if (!container) return;
      const images = Array.from(container.querySelectorAll('img'));
      for (const img of images) {
        const src = img.getAttribute('src');
        if (!src || isData(src)) continue;
        const dataUri = await convertUrl(src);
        if (dataUri) img.setAttribute('src', dataUri);
      }
    };

    const createTagsCloneForSlide = (slideData, referencePane, cloneFn) => {
      if (!slideData || !Array.isArray(slideData.tags) || !slideData.tags.length) return null;

      const wrapper = document.createElement('div');
      wrapper.className = 'text-pane' + (referencePane && referencePane.classList.contains('center') ? ' center' : '');
      wrapper.style.position = 'fixed';
      wrapper.style.opacity = '0';
      wrapper.style.pointerEvents = 'none';
      wrapper.style.zIndex = '-1';
      wrapper.style.inset = '0';
      document.body.appendChild(wrapper);

      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'tags-container';
      slideData.tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag-item';
        tagElement.textContent = tag;
        tagsContainer.appendChild(tagElement);
      });
      wrapper.appendChild(tagsContainer);

      const clone = cloneFn(tagsContainer, { removeIds: true });
      wrapper.remove();
      return clone;
    };

    const imageToDataUri = async (url) => {
      if (!url || isData(url)) return url;
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${url}`);
        const blob = await response.blob();
        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.warn(`Could not convert image to Data URI, using original URL as fallback: ${url}`, error);
        return url;
      }
    };

    function getLogoPositionStyle(config) {
      const m = (config.logoMargin || 16) + 'px';
      switch (config.logoCorner) {
        case 'tr': return `top: ${m}; right: ${m};`;
        case 'br': return `bottom: ${m}; right: ${m};`;
        case 'bl': return `bottom: ${m}; left: ${m};`;
        case 'tl':
        default: return `top: ${m}; left: ${m};`;
      }
    }

    const urlToDataUriMap = new Map();
    const convertUrlToDataUri = async (url) => {
      if (!url || isData(url)) return url;
      let normalized = url;
      if (!isHttp(normalized) && !isData(normalized) && !/^presentation\//i.test(normalized) && !/^app\//i.test(normalized)) {
        normalized = resolveSrc(normalized);
      }
      if (urlToDataUriMap.has(normalized)) {
        return urlToDataUriMap.get(normalized);
      }
      const dataUri = await imageToDataUri(normalized);
      urlToDataUriMap.set(normalized, dataUri);
      return dataUri;
    };

    const originalSlides = slides;
    const originalIdx = idx;
    let replacedSlides = false;

    let slidesForExport = [];
    let slidesHtml = [];
    let invertFlags = [];
    let foldFlags = [];
    let logoDataUri = null;
    let foldDataUri = null;

    try {
      slidesForExport = await Promise.all(slides.map(async (slide) => {
        const clone = { ...slide };
        if (Array.isArray(slide.tags)) {
          clone.tags = [...slide.tags];
        }
        if (clone.image) {
          clone.image = await convertUrlToDataUri(clone.image);
        }
        return clone;
      }));

      if (!slidesForExport.length) {
        throw new Error('Aucune diapositive disponible pour export.');
      }

      logoDataUri = cfg.logoUrl ? await convertUrlToDataUri(cfg.logoUrl) : null;
      const foldSrc = foldImg ? foldImg.getAttribute('src') : null;
      foldDataUri = (cfg.showFoldImage && foldSrc) ? await convertUrlToDataUri(foldSrc) : null;

      slides = slidesForExport;
      replacedSlides = true;

      invertFlags = slidesForExport.map(s => !!s.invert);
      foldFlags = slidesForExport.map(s => !!(cfg.showFoldImage && s.image && slideHasContent(s)));

      slidesHtml = [];

      for (let i = 0; i < slidesForExport.length; i++) {
        await waitUntil(() => !busy);
        const direction = i === idx ? 0 : (i > idx ? 1 : -1);
        show(i, direction);
        await waitUntil(() => !busy && idx === i);

        const imageBuffers = (cfg.imageSide === 'left') ? P1 : P2;
        const textBuffers = (cfg.imageSide === 'left') ? P2 : P1;
        const imagePane = imageBuffers[active] || null;
        const textPane = textBuffers[active] || null;

        if (textPane && textPane.__renderPromise && typeof textPane.__renderPromise.then === 'function') {
          try {
            await textPane.__renderPromise;
          } catch (err) {
            console.warn("Erreur de rendu lors de l'export:", err);
          }
        }

        await convertInlineImages(textPane, convertUrlToDataUri);

        const stageComputed = window.getComputedStyle(stage);
        const slideClone = document.createElement('div');
        slideClone.className = 'slide';
        if (i === 0) slideClone.classList.add('active');
        slideClone.dataset.index = String(i);
        slideClone.dataset.invert = invertFlags[i] ? 'true' : 'false';
        slideClone.dataset.fold = foldFlags[i] ? 'true' : 'false';

        slideClone.style.width = '100%';
        slideClone.style.height = '100%';
        slideClone.style.display = stageComputed.getPropertyValue('display') || 'grid';
        const gridCols = stageComputed.getPropertyValue('grid-template-columns');
        if (gridCols) slideClone.style.gridTemplateColumns = gridCols;
        const gridRows = stageComputed.getPropertyValue('grid-template-rows');
        if (gridRows) slideClone.style.gridTemplateRows = gridRows;
        const alignItems = stageComputed.getPropertyValue('align-items');
        if (alignItems) slideClone.style.alignItems = alignItems;
        const justifyItems = stageComputed.getPropertyValue('justify-items');
        if (justifyItems) slideClone.style.justifyItems = justifyItems;
        const gap = stageComputed.getPropertyValue('gap');
        if (gap) slideClone.style.gap = gap;
        const padding = stageComputed.getPropertyValue('padding');
        if (padding) slideClone.style.padding = padding;

        Array.from(stage.children).forEach((paneEl) => {
          const paneClone = cloneNodeWithInlineStyles(paneEl, { removeIds: true });
          if (!paneClone) return;
          paneClone.innerHTML = '';

          const paneBuffers = Array.from(paneEl.children);
          const activeBuffer = paneBuffers[active];
          if (activeBuffer) {
            const bufferClone = cloneNodeWithInlineStyles(activeBuffer, { removeIds: true });
            if (bufferClone && bufferClone.classList && bufferClone.classList.contains('text-pane')) {
              const tagsClone = createTagsCloneForSlide(slidesForExport[i], textPane, cloneNodeWithInlineStyles);
              if (tagsClone) bufferClone.appendChild(tagsClone);
            }
            if (bufferClone) paneClone.appendChild(bufferClone);
          }

          slideClone.appendChild(paneClone);
        });

        slidesHtml.push(slideClone.outerHTML);
      }

      const googleFontsLink = cfg.googleFonts && cfg.googleFonts.length
        ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${cfg.googleFonts.map(f => 'family='+f.trim().replace(/\s+/g,'+')).join('&')}&display=swap">`
        : '';

      const dynamicStyles = `
        :root {
          --bg: ${cfg.background};
          --text: ${cfg.textColor};
          --speed: ${cfg.speed}ms;
          --easing: ${cfg.easing === 'linear' ? 'linear' : 'cubic-bezier(0.16,1,0.3,1)'};
        }
      `;

      const staticCss = `
        html, body { height: 100%; margin: 0; overflow: hidden; }
        body { background: var(--bg); color: var(--text); font-family: ${cfg.bodyFont}; transition: background-color var(--speed) var(--easing), color var(--speed) var(--easing); }
        #stage { position: relative; width: 100vw; height: 100vh; overflow: hidden; }
        .slide { position: absolute; inset: 0; opacity: 0; pointer-events: none; transition: opacity calc(var(--speed) / 2) var(--easing); }
        .slide.active { opacity: 1; pointer-events: auto; z-index: 1; }
        #brandLogo { position: fixed; z-index: 200; pointer-events: none; }
        #blackout, #whiteout { position: fixed; inset: 0; pointer-events: none; z-index: 300; opacity: 0; transition: opacity 300ms ease; }
        #blackout { background: #000; }
        #whiteout { background: #fff; }
        body.cover-black #blackout { opacity: 1; }
        body.cover-white #whiteout { opacity: 1; }
        body.is-fullscreen #brandLogo { display: block !important; }
        #vignette { position: fixed; inset: 0; pointer-events: none; z-index: 180; }
        #foldImage { position: fixed; bottom: 0; right: 0; pointer-events: none; z-index: 150; height: 100vh; width: auto; transition: opacity var(--speed) var(--easing); mix-blend-mode: multiply; }
      `;

      const foldOpacity = clamp(cfg.foldImageOpacity, 0, 1);
      const vignetteStyle = cfg.vignette
        ? `radial-gradient(ellipse at center, rgba(0,0,0,0) ${Math.round((1-cfg.vignetteStrength)*100)}%, rgba(0,0,0,${cfg.vignetteStrength}) 100%)`
        : 'none';
      const foldInlineStyle = foldDataUri
        ? `${foldFlags[0] ? 'display: block;' : 'display: none;'} opacity: ${foldFlags[0] ? foldOpacity : 0};`
        : '';

      const interactivityScript = `
        (function(){
          const slides = Array.from(document.querySelectorAll('.slide'));
          const slideInvert = ${JSON.stringify(invertFlags)};
          const foldStates = ${JSON.stringify(foldFlags)};
          const colors = { bg: '${cfg.background}', text: '${cfg.textColor}' };
          const foldImage = document.getElementById('foldImage');
          const foldOpacity = ${clamp(cfg.foldImageOpacity, 0, 1)};
          let idx = 0;

          function applySlideTheme(i) {
            const invert = slideInvert[i];
            document.body.style.background = invert ? colors.text : colors.bg;
            document.body.style.color = invert ? colors.bg : colors.text;
            if (foldImage) {
              const visible = foldStates[i];
              foldImage.style.display = visible ? 'block' : 'none';
              foldImage.style.opacity = visible ? String(foldOpacity) : '0';
            }
          }

          function show(i) {
            if (i < 0 || i >= slides.length || i === idx) return;
            const current = slides[idx];
            const next = slides[i];
            if (current) current.classList.remove('active');
            if (next) next.classList.add('active');
            applySlideTheme(i);
            idx = i;
          }

          function toggleBlack(){ document.body.classList.toggle('cover-black'); document.body.classList.remove('cover-white'); }
          function toggleWhite(){ document.body.classList.toggle('cover-white'); document.body.classList.remove('cover-black'); }
          function clearCovers(){ document.body.classList.remove('cover-black','cover-white'); }
          async function toggleFullscreen(){
            try {
              if (document.fullscreenElement) await document.exitFullscreen();
              else await document.documentElement.requestFullscreen();
            } catch(e) { console.warn('Fullscreen error', e); }
          }

          document.addEventListener('keydown', e => {
            const tag = (e.target && e.target.tagName || '').toUpperCase();
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            const key = e.key.toLowerCase();
            if (key === 'arrowright' || key === 'pagedown' || key === ' ') { e.preventDefault(); show(idx + 1); }
            else if (key === 'arrowleft' || key === 'pageup') { e.preventDefault(); show(idx - 1); }
            else if (key === 'b') toggleBlack();
            else if (key === 'w') toggleWhite();
            else if (key === 'escape') clearCovers();
            else if (key === 'f') toggleFullscreen();
          });

          document.addEventListener('click', e => {
            if (e.clientX < window.innerWidth / 3) show(idx - 1);
            else if (e.clientX > window.innerWidth * 2 / 3) show(idx + 1);
          });

          if (slides[0]) {
            slides[0].classList.add('active');
            applySlideTheme(0);
          }
        })();
      `;

      const logoInlineStyle = logoDataUri
        ? `${getLogoPositionStyle(cfg)} width: ${(cfg.logoSize || 120)}px; height: auto; opacity: ${cfg.logoOpacity}; border-radius: ${(cfg.logoRadius || 0)}px; ${cfg.logoShadow ? 'filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));' : 'filter: none;'}`
        : '';

      const finalHtml = `
        <!DOCTYPE html>

        <html lang="fr">

        <head>

          <meta charset="UTF-8">

          <meta name="viewport" content="width=device-width, initial-scale=1.0">

          <title>Présentation</title>

          ${googleFontsLink}

          <style>

            ${dynamicStyles}

            ${staticCss}

          </style>

        </head>

        <body>

          <div id="stage">

            ${slidesHtml.join('\n')}

          </div>

          ${logoDataUri ? `<img id="brandLogo" src="${logoDataUri}" style="${logoInlineStyle}" alt="Logo">` : ''}

          <div id="vignette" style="background: ${vignetteStyle};"></div>

          ${foldDataUri ? `<img id="foldImage" src="${foldDataUri}" style="${foldInlineStyle}" alt="Fold">` : ''}

          <div id="blackout"></div>

          <div id="whiteout"></div>

          <script>

            ${interactivityScript}

          </script>

        </body>

        </html>

      `;

      const blob = new Blob([finalHtml.trim()], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'presentation.html';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 500);

      alert('Téléchargement terminé ! Le fichier HTML est entièrement autonome.');
    } catch (error) {
      console.error('Erreur lors de la création du fichier de présentation :', error);
      alert('Une erreur est survenue lors de la préparation du téléchargement. Veuillez vérifier la console pour plus de détails.');
    } finally {
      if (replacedSlides) {
        await waitUntil(() => !busy);
        slides = originalSlides;
        if (originalSlides && originalSlides.length) {
          show(Math.min(originalIdx, originalSlides.length - 1), 0);
        }
      }
    }
  }


})();
