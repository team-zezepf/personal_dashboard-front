/*
 * 資格学習のまとめ(docs/)の「用語集」の検索・分野の絞り込みを動かすスクリプト(front#209)。
 * - GitHub Pages: 用語集のページの <script src="../assets/glossary.js"> で読み込む
 * - アプリ: 本文は innerHTML で差し込むため本文中の <script> は実行されない。angular.json の scripts で読み込む
 * どちらでも後から差し込まれた本文で動くよう、入力とクリックは document でまとめて受け取る(イベント委譲)。
 */
(function () {
  if (window.__docsGlossaryLoaded) return;
  window.__docsGlossaryLoaded = true;

  // 全角英数を半角に、カタカナをひらがなに、英字を小文字にそろえて比べる(文字数は変わらないため、一致した位置をそのまま使える)
  function normalize(s) {
    return String(s)
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xfee0); })
      .replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); })
      .toLowerCase();
  }

  var SEARCH_TARGETS = '.gl-name, .gl-reading, .gl-desc';

  function clearMarks(article) {
    article.querySelectorAll('mark.gl-hit').forEach(function (mark) {
      var parent = mark.parentNode;
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parent.normalize();
    });
  }

  function highlight(el, query) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var text = node.nodeValue;
      var norm = normalize(text);
      if (norm.length !== text.length || norm.indexOf(query) < 0) return;
      var frag = document.createDocumentFragment();
      var pos = 0;
      var i;
      while ((i = norm.indexOf(query, pos)) >= 0) {
        frag.appendChild(document.createTextNode(text.slice(pos, i)));
        var mark = document.createElement('mark');
        mark.className = 'gl-hit';
        mark.textContent = text.slice(i, i + query.length);
        frag.appendChild(mark);
        pos = i + query.length;
      }
      frag.appendChild(document.createTextNode(text.slice(pos)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  function apply(article) {
    var input = article.querySelector('.gl-search');
    var query = normalize((input && input.value) || '').trim();
    var active = article.querySelector('.gl-filters button.on');
    var category = (active && active.getAttribute('data-category')) || '';

    clearMarks(article);
    var total = 0;
    var shown = 0;
    article.querySelectorAll('section.gl-row').forEach(function (row) {
      var rowShown = 0;
      row.querySelectorAll('.gl-term').forEach(function (term) {
        total++;
        var targets = term.querySelectorAll(SEARCH_TARGETS);
        var text = Array.prototype.map.call(targets, function (el) { return normalize(el.textContent); }).join('\n');
        var visible = (!category || term.getAttribute('data-category') === category) && (!query || text.indexOf(query) >= 0);
        term.hidden = !visible;
        if (visible) {
          rowShown++;
          if (query) targets.forEach(function (el) { highlight(el, query); });
        }
      });
      row.hidden = rowShown === 0;
      shown += rowShown;
    });

    var count = article.querySelector('.gl-count');
    if (count) count.textContent = query || category ? shown + '語(全' + total + '語中)' : total + '語';
    var empty = article.querySelector('.gl-empty');
    if (empty) empty.hidden = shown > 0;
  }

  document.addEventListener('input', function (e) {
    var input = e.target;
    if (!(input instanceof HTMLInputElement) || !input.classList.contains('gl-search')) return;
    var article = input.closest('.genre-article.glossary');
    if (article) apply(article);
  });

  document.addEventListener('click', function (e) {
    var button = e.target instanceof Element ? e.target.closest('.gl-filters button') : null;
    if (!button) return;
    var article = button.closest('.genre-article.glossary');
    if (!article) return;
    article.querySelectorAll('.gl-filters button').forEach(function (b) {
      var on = b === button;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    apply(article);
  });
})();
