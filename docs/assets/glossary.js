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

  /*
   * 用語テスト(front#211)。用語の説明を見て、用語を入力して答える。結果は保存しない。
   * 出題には用語集の本文(.gl-term)をそのまま使い、分野で絞り込んでいるときはその分野から出題する。
   */
  var QUESTIONS = 10;

  // 全角英数→半角・半角カナ→全角(NFKC)、カタカナ→ひらがな、小文字にそろえ、空白と中点を除いて比べる
  function answerKey(s) {
    return String(s)
      .normalize('NFKC')
      .replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); })
      .toLowerCase()
      .replace(/[\s・]/g, '');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  // 「CPU(中央処理装置)」→ ['CPU', '中央処理装置']。かっこがなければ null
  function splitParen(name) {
    var m = name.match(/^(.+?)\((.+)\)$/);
    return m ? [m[1], m[2]] : null;
  }

  function readTerm(el) {
    var name = el.querySelector('.gl-name').textContent;
    var reading = el.getAttribute('data-reading') || '';
    var parts = splitParen(name);
    var rel = el.querySelector('.gl-rel');
    return {
      name: name,
      reading: reading,
      category: el.getAttribute('data-category') || '',
      desc: el.querySelector('.gl-desc').textContent,
      relHtml: rel ? rel.innerHTML : '',
      // 用語そのもの・読み・かっこの外・かっこの中のどれと一致しても正解
      answers: [name, reading].concat(parts || []).filter(Boolean).map(answerKey),
      // 説明の中で答えを隠す語(長いものから置き換える)
      masks: [name].concat(parts || []).sort(function (a, b) { return b.length - a.length; })
    };
  }

  var quizzes = new WeakMap();

  function activeCategory(article) {
    var on = article.querySelector('.gl-filters button.on');
    return (on && on.getAttribute('data-category')) || '';
  }

  function quizBox(article) {
    var box = article.querySelector('.gl-quiz');
    if (!box) {
      box = document.createElement('div');
      box.className = 'gl-quiz';
      var tools = article.querySelector('.gl-tools');
      tools.parentNode.insertBefore(box, tools.nextSibling);
    }
    return box;
  }

  function startQuiz(article) {
    var category = activeCategory(article);
    // 結果画面の「間違えた用語」も .gl-term なので、用語集の本文(50音の行)の中だけから集める
    var pool = Array.prototype.map.call(article.querySelectorAll('section.gl-row .gl-term'), readTerm).filter(function (t) {
      return !category || t.category === category;
    });
    if (pool.length === 0) return;
    quizzes.set(article, { items: shuffle(pool).slice(0, QUESTIONS), index: 0, missed: [], category: category });
    article.classList.add('gl-quiz-active');
    askQuestion(article);
    quizBox(article).scrollIntoView({ block: 'nearest' });
  }

  function endQuiz(article) {
    quizzes.delete(article);
    article.classList.remove('gl-quiz-active');
    var box = article.querySelector('.gl-quiz');
    if (box) box.remove();
    article.querySelector('.gl-tools').scrollIntoView({ block: 'nearest' });
  }

  function headHtml(quiz, right) {
    return '<div class="gl-quiz-head"><span>📝 用語テスト' + (quiz.category ? '(' + escapeHtml(quiz.category) + ')' : '') +
      '</span><span>' + right + '</span></div>';
  }

  function askQuestion(article) {
    var quiz = quizzes.get(article);
    var term = quiz.items[quiz.index];
    var total = quiz.items.length;
    var desc = escapeHtml(term.desc);
    term.masks.forEach(function (w) { desc = desc.split(escapeHtml(w)).join('〇〇'); });

    var box = quizBox(article);
    box.innerHTML =
      headHtml(quiz, '第 ' + (quiz.index + 1) + ' 問 / 全 ' + total + ' 問') +
      '<div class="gl-quiz-progress"><span style="width:' + (quiz.index / total) * 100 + '%"></span></div>' +
      '<p class="gl-quiz-label">この説明にあてはまる用語は?</p>' +
      '<p class="gl-quiz-desc">' + desc + '</p>' +
      '<form class="gl-quiz-form">' +
      '<input class="gl-quiz-input" autocomplete="off" placeholder="用語を入力" aria-label="答えの用語">' +
      '<button type="submit" class="gl-quiz-submit primary">回答する</button>' +
      '</form>' +
      '<div class="gl-quiz-sub">' +
      '<button type="button" class="gl-quiz-hint-button">💡 ヒント</button><span class="gl-quiz-hint" aria-live="polite"></span>' +
      '<button type="button" class="gl-quiz-giveup">わからない</button>' +
      '</div>' +
      '<div class="gl-quiz-result" aria-live="polite" hidden></div>' +
      '<div class="gl-quiz-actions">' +
      '<button type="button" class="gl-quiz-quit">やめる</button>' +
      '<button type="button" class="gl-quiz-next primary" hidden>' + (quiz.index + 1 < total ? '次へ' : '結果を見る') + '</button>' +
      '</div>';

    var input = box.querySelector('.gl-quiz-input');
    input.focus({ preventScroll: true });

    box.querySelector('.gl-quiz-hint-button').addEventListener('click', function (e) {
      // ヒントは「かっこの外」の最初の1文字と文字数
      var base = (splitParen(term.name) || [term.name])[0];
      box.querySelector('.gl-quiz-hint').textContent = '「' + Array.from(base)[0] + '」で始まる' + Array.from(base).length + '文字';
      e.currentTarget.disabled = true;
      input.focus();
    });

    function finish(given) {
      if (given !== null && answerKey(given) === '') {
        input.focus();
        return;
      }
      var ok = given !== null && term.answers.indexOf(answerKey(given)) >= 0;
      input.readOnly = true;
      input.classList.add(ok ? 'is-correct' : 'is-wrong');
      box.querySelectorAll('.gl-quiz-submit, .gl-quiz-hint-button, .gl-quiz-giveup').forEach(function (b) { b.disabled = true; });
      if (!ok) quiz.missed.push({ term: term, given: given });
      var result = box.querySelector('.gl-quiz-result');
      result.hidden = false;
      result.innerHTML =
        (ok ? '<span class="gl-quiz-ok">○ 正解</span>　' : '<span class="gl-quiz-ng">× ' + (given === null ? 'わからない' : '不正解') + '</span>　正解は ') +
        '<span class="gl-quiz-answer">' + escapeHtml(term.name) + '</span>' +
        (term.reading ? '<span class="gl-quiz-reading">' + escapeHtml(term.reading) + '</span>' : '');
      var next = box.querySelector('.gl-quiz-next');
      next.hidden = false;
      next.focus({ preventScroll: true }); // Enter で次へ進める
    }

    box.querySelector('.gl-quiz-form').addEventListener('submit', function (e) {
      e.preventDefault();
      finish(input.value);
    });
    box.querySelector('.gl-quiz-giveup').addEventListener('click', function () { finish(null); });
    box.querySelector('.gl-quiz-next').addEventListener('click', function () {
      quiz.index++;
      if (quiz.index < total) askQuestion(article);
      else showResult(article);
    });
    box.querySelector('.gl-quiz-quit').addEventListener('click', function () { endQuiz(article); });
  }

  function showResult(article) {
    var quiz = quizzes.get(article);
    var total = quiz.items.length;
    var missed = quiz.missed.map(function (m) {
      return '<div class="gl-term"><dt><span class="gl-name">' + escapeHtml(m.term.name) + '</span>' +
        (m.term.reading ? '<span class="gl-reading">' + escapeHtml(m.term.reading) + '</span>' : '') + '</dt>' +
        '<dd><p class="gl-quiz-yours">あなたの答え: ' + (m.given === null ? '(わからない)' : escapeHtml(m.given)) + '</p>' +
        '<p class="gl-desc">' + escapeHtml(m.term.desc) + '</p>' +
        (m.term.relHtml ? '<p class="gl-rel">' + m.term.relHtml + '</p>' : '') + '</dd></div>';
    }).join('');

    var box = quizBox(article);
    box.innerHTML =
      headHtml(quiz, '結果') +
      '<div class="gl-quiz-score">正解数<strong>' + (total - quiz.missed.length) + ' / ' + total + '</strong></div>' +
      (missed
        ? '<div class="gl-quiz-missed"><h3>間違えた用語</h3><dl class="gl-list">' + missed + '</dl></div>'
        : '<p class="gl-quiz-perfect">全問正解です!</p>') +
      '<div class="gl-quiz-actions">' +
      '<button type="button" class="gl-quiz-back">用語集に戻る</button>' +
      '<button type="button" class="gl-quiz-again primary">もう一度(別の問題)</button>' +
      '</div>';
    box.querySelector('.gl-quiz-back').addEventListener('click', function () { endQuiz(article); });
    box.querySelector('.gl-quiz-again').addEventListener('click', function () { startQuiz(article); });
    box.scrollIntoView({ block: 'nearest' });
  }

  // 「用語テスト」ボタンは本文と一緒に後から差し込まれる(アプリ)ため、document でまとめて受け取る
  document.addEventListener('click', function (e) {
    var button = e.target instanceof Element ? e.target.closest('.gl-quiz-start') : null;
    if (!button) return;
    var article = button.closest('.genre-article.glossary');
    if (article) startQuiz(article);
  });
})();
