/* Quântica Analítica · protótipo de média fidelidade · comportamento compartilhado */
(function(){
  var doc=document, $=function(s,c){return (c||doc).querySelector(s)}, $$=function(s,c){return [].slice.call((c||doc).querySelectorAll(s))};

  /* alinha a grade técnica e as linhas que saem da borda à margem da coluna de texto */
  function alinhaGrade(){ var w=$('main .wrap')||$('.wrap'); if(w) doc.documentElement.style.setProperty('--gx', w.getBoundingClientRect().left+'px'); }
  alinhaGrade(); addEventListener('resize',alinhaGrade);

  /* o traço sempre passa o fim do texto que ele sustenta ou separa: mede o texto real */
  function fimTexto(el){ var r=doc.createRange(); r.selectNodeContents(el); var rs=r.getClientRects(), m=0; for(var i=0;i<rs.length;i++){ if(rs[i].width>0) m=Math.max(m,rs[i].right); } return m; }
  function medeLinhas(){
    var folga=doc.documentElement.clientWidth<=900?24:48;
    $$('.linha-sobe, .hero .lnk').forEach(function(l){
      var textos=[], p=l.previousElementSibling;
      while(p){ if(/^(H1|H2|P|NAV)$/.test(p.tagName)||p.classList.contains('tag')) textos.push(p); p=p.previousElementSibling; }
      var d=0; textos.forEach(function(e){ e.classList.add('sob-linha'); if(e.offsetParent) d=Math.max(d,fimTexto(e)); });
      if(d) l.style.width=(d-l.getBoundingClientRect().left+folga)+'px';
    });
    $$('.sepx').forEach(function(s){
      var d=0, L=s.getBoundingClientRect().left;
      [].slice.call(s.parentElement.children).forEach(function(e){ if(e!==s&&/^(P|H2|H3)$/.test(e.tagName)){ e.classList.add('sob-linha'); if(e.offsetParent) d=Math.max(d,fimTexto(e)); } });
      if(d) s.style.setProperty('--sw',(d-L)+'px');
    });
  }
  medeLinhas(); addEventListener('resize',medeLinhas); if(doc.fonts&&doc.fonts.ready) doc.fonts.ready.then(medeLinhas);
  window.QA_medeLinhas=medeLinhas;

  /* camada de notas de layout */
  if(/[?&]notas=0/.test(location.search)) doc.body.classList.add('sem-notas');
  var tn=$('.toggle-notas');
  if(tn&&doc.body.classList.contains('sem-notas')) tn.querySelector('span').textContent='Notas de layout: desligadas';
  if(tn) tn.addEventListener('click',function(){ var off=doc.body.classList.toggle('sem-notas'); tn.querySelector('span').textContent='Notas de layout: '+(off?'desligadas':'ligadas'); });

  /* menu do celular */
  var b=$('.burger'), topo=$('.topo');
  if(b&&topo){
    b.addEventListener('click',function(){ var on=topo.classList.toggle('aberto'); b.setAttribute('aria-expanded',on); b.setAttribute('aria-label',on?'Fechar menu':'Abrir menu'); });
    /* no celular, a área com submenu abre em acordeão em vez de navegar */
    $$('.menu>li').forEach(function(li){ var a=li.querySelector('a'), d=li.querySelector('.drop'); if(!d) return;
      a.addEventListener('click',function(e){ if(!topo.classList.contains('aberto')) return; e.preventDefault(); var on=li.classList.toggle('sub-aberto'); a.setAttribute('aria-expanded',on); }); });
  }

  /* busca de equipamentos (no WordPress: JetSmartFilters ou busca nativa restrita ao tipo Equipamento) */
  var bb=$('.busca-btn'), bx=$('#busca'), bq=$('#busca-q'), br=$('.busca-res');
  if(bb&&bx&&bq&&br){
    var norm=function(t){ return t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); };
    var render=function(){ var q=norm(bq.value.trim());
      var lista=(window.QA_PRODUTOS||[]).filter(function(p){ return !q||norm(p[0]+' '+p[1]).indexOf(q)>-1; }).slice(0,8);
      br.innerHTML=lista.length?lista.map(function(p){ var w=p[1].indexOf('Waters')===0; var im=p[2]?'<img src="assets/img/'+p[2]+'" alt="">':'<i></i>';
        return '<li><a href="'+(w?window.QA_WATERS:window.QA_FICHA)+'">'+im+'<span><b>'+p[0]+'</b><small>'+p[1]+'</small></span></a></li>'; }).join('')
        :'<li class="busca-vazia">Nenhum equipamento com esse nome. <a class="link" href="Quantica_Site_Layout_Inst_Contato.html?assunto=equip">Falar com um especialista</a></li>'; };
    bb.addEventListener('click',function(){ var abre=bx.hidden; bx.hidden=!abre; bb.setAttribute('aria-expanded',abre); if(abre){ render(); bq.focus(); } });
    bq.addEventListener('input',render);
    doc.addEventListener('keydown',function(e){ if(e.key==='Escape'&&!bx.hidden){ bx.hidden=true; bb.setAttribute('aria-expanded',false); bb.focus(); } });
  }

  /* vitrine de produtos: filtro por uso e fabricante + setas (Home) */
  var trilho=$('.trilho');
  if(trilho){
    var f={uso:'todos',fab:'todos'}, cards=$$('.prod',trilho), cont=$('#contagem'), vazio=$('#vazio'), setas=$$('.seta');
    var passa=function(c,uso,fab){ return (uso==='todos'||c.dataset.uso===uso)&&(fab==='todos'||c.dataset.fab===fab); };
    var conta=function(uso,fab){ return cards.filter(function(c){return passa(c,uso,fab)}).length; };
    var setasOk=function(){ if(setas.length<2)return; var fim=trilho.scrollWidth-trilho.clientWidth-2; setas[0].disabled=trilho.scrollLeft<=2; setas[1].disabled=trilho.scrollLeft>=fim; };
    var aplica=function(){
      var nS=0,nW=0;
      cards.forEach(function(c){ var ok=passa(c,f.uso,f.fab); c.classList.toggle('hide',!ok); if(ok){ c.dataset.fab==='waters'?nW++:nS++; } });
      var partes=[]; if(nS) partes.push(nS+(nS===1?' equipamento SOTAX':' equipamentos SOTAX')); if(nW) partes.push(nW+(nW===1?' linha Waters':' linhas Waters'));
      if(cont) cont.textContent=partes.join(' e ');
      var nada=(nS+nW)===0; if(vazio) vazio.classList.toggle('on',nada); trilho.style.display=nada?'none':'';
      $$('.filtro').forEach(function(g){ var d=g.dataset.f; $$('.chip',g).forEach(function(x){
        var n=d==='uso'?conta(x.dataset.v,f.fab):conta(f.uso,x.dataset.v); x.disabled=n===0&&!x.classList.contains('on'); x.setAttribute('aria-pressed',x.classList.contains('on')); }); });
      trilho.scrollLeft=0; setasOk();
    };
    $$('.filtro').forEach(function(g){ g.addEventListener('click',function(e){ var x=e.target.closest('.chip'); if(!x||x.disabled)return; $$('.chip',g).forEach(function(y){y.classList.remove('on')}); x.classList.add('on'); f[g.dataset.f]=x.dataset.v; aplica(); }); });
    var lp=$('#limpar'); if(lp) lp.addEventListener('click',function(){ f={uso:'todos',fab:'todos'}; $$('.filtro .chip').forEach(function(x){x.classList.toggle('on',x.dataset.v==='todos')}); aplica(); });
    setas.forEach(function(s){ s.addEventListener('click',function(){ var c=$('.prod:not(.hide)',trilho); var u=c?c.offsetWidth+16:trilho.clientWidth; var passo=Math.max(u,Math.floor(trilho.clientWidth/u)*u); trilho.scrollBy({left:+s.dataset.d*passo,behavior:'smooth'}); }); });
    trilho.addEventListener('scroll',setasOk,{passive:true}); addEventListener('resize',setasOk);
    aplica();
  }

  /* assunto do formulário: escolha direta, botão clicado na página ou link com ?assunto= */
  function marcaAssunto(v){
    if(!v) return;
    $$('.contexto button').forEach(function(x){ var on=x.dataset.assunto===v; x.classList.toggle('on',on); x.setAttribute('aria-pressed',on); });
    $$('.assunto-sel').forEach(function(sel){ if(sel.querySelector('option[value="'+v+'"]')) sel.value=v; });
    var fc=$('.form-contato'); if(fc){ fc.dataset.assunto=v; $$('[data-so]',fc).forEach(function(el){ el.classList.toggle('mostra',el.dataset.so.split(' ').indexOf(v)>-1); }); }
    var t=$('[data-titulo-assunto]'), sl=$('.form-contato .assunto-sel'); if(t&&sl){ var op=sl.options[sl.selectedIndex]; if(op&&op.dataset.frase) t.textContent=op.dataset.frase; }
  }
  $$('.contexto button').forEach(function(x){ x.addEventListener('click',function(){ marcaAssunto(x.dataset.assunto); }); });
  $$('.assunto-sel').forEach(function(sel){ sel.addEventListener('change',function(){ marcaAssunto(sel.value); }); });
  $$('a[data-assunto]').forEach(function(a){ a.addEventListener('click',function(){ if(a.getAttribute('href').charAt(0)==='#') marcaAssunto(a.dataset.assunto); }); });
  var q=new URLSearchParams(location.search).get('assunto'); marcaAssunto(q||($('.assunto-sel')||{}).value);

  /* formulários: no protótipo, enviar leva à página de obrigado do assunto */
  $$('form[data-envia]').forEach(function(fm){ fm.addEventListener('submit',function(e){ e.preventDefault(); var a=fm.dataset.envia; if(a==='assunto') a=fm.dataset.assunto||'equip'; location.href=(window.QA_OBRIGADO||'')+'?assunto='+a; }); });
  /* proposta vinda da ficha: o produto já chega preenchido */
  var pr=new URLSearchParams(location.search).get('produto'); if(pr){ var cx=$('#cx'); if(cx) cx.value='Produto: '+pr+'\n'; }

  /* serviço do laboratório vindo da página da Fase 2 */
  var sv=new URLSearchParams(location.search).get('servico'); if(sv){ var cl=$('#cl'); if(cl) cl.value='Serviço: '+sv+'\n'; }

  /* propostas: faixa fixa com sombra só quando presa, e item atual marcado conforme a rolagem */
  $$('.linhas-nav,.subnav').forEach(function(nav){
    var sentinela=doc.createElement('div'); nav.parentNode.insertBefore(sentinela,nav);
    if('IntersectionObserver' in window) new IntersectionObserver(function(es){ nav.classList.toggle('preso',!es[0].isIntersecting); },{rootMargin:'-89px 0px 0px 0px'}).observe(sentinela);
  });
  var sub=$('.subnav');
  if(sub&&'IntersectionObserver' in window){
    var links=$$('a',sub), alvos=links.map(function(a){ return doc.querySelector(a.getAttribute('href')); }).filter(Boolean);
    var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ links.forEach(function(a){ var on=a.getAttribute('href')==='#'+e.target.id; a.classList.toggle('ativo',on); if(on){ a.setAttribute('aria-current','true'); var w=a.parentNode; if(w.scrollWidth>w.clientWidth) w.scrollLeft=a.offsetLeft-16; } else a.removeAttribute('aria-current'); }); } }); },{rootMargin:'-45% 0px -50% 0px'});
    alvos.forEach(function(t){ io.observe(t); });
  }

  /* página de obrigado: mensagem por assunto */
  var ob=$$('[data-obrigado]'); if(ob.length){ var alvo=(q&&ob.some(function(e){return e.dataset.obrigado===q}))?q:'padrao'; ob.forEach(function(el){ el.style.display=el.dataset.obrigado===alvo?'':'none'; }); }

  /* laboratório: alterna Fase 1 e Fase 2 (só no protótipo) */
  $$('.fase-toggle button').forEach(function(x){ x.addEventListener('click',function(){ doc.body.classList.toggle('ver-fase2',x.dataset.fase==='2'); $$('.fase-toggle button').forEach(function(y){y.classList.toggle('on',y===x)}); alinhaGrade(); medeLinhas(); }); });

  /* ficha: galeria */
  $$('.galeria .miniaturas button').forEach(function(x){ x.addEventListener('click',function(){ var im=x.querySelector('img'); var p=$('.galeria .principal img'); if(im&&p){ p.src=im.src; p.alt=im.alt; } $$('.galeria .miniaturas button').forEach(function(y){y.classList.toggle('on',y===x)}); }); });

  /* filtros de conteúdo (biblioteca, blog): só marca o chip, conteúdo real vem do WordPress */
  $$('.filtro-conteudo').forEach(function(g){ g.addEventListener('click',function(e){ var x=e.target.closest('.chip'); if(!x)return; $$('.chip',g).forEach(function(y){y.classList.toggle('on',y===x); y.setAttribute('aria-pressed',y===x)}); var v=x.dataset.v; $$('[data-cat]').forEach(function(c){ c.style.display=(v==='todos'||c.dataset.cat.split(' ').indexOf(v)>-1)?'':'none'; }); }); });
})();
