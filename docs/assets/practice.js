/*
 * GitHub Pages の「ランダム出題の練習問題」を動かすスクリプト(front#170、今は基本情報 科目Bで使う)。
 * window.PRACTICE_QUESTIONS(scripts/build-kihonjoho-b-questions.mjs で生成)から、選んだ分野の問題を
 * ランダムに出題し、1問ずつ答え合わせ → 最後に結果を表示する。解いた結果は保存しない。
 * 書き方は docs/README.md を参照。
 */
(function () {
  var KANA = 'アイウエオカキクケコ';

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // 擬似言語のプログラムを行番号付きで表示する。〔a〕のような空欄は枠で強調する(アプリの code-block と同じ)
  function codeHtml(code) {
    return '<div class="practice-code">' + code.split('\n').map(function (line, i) {
      var src = escapeHtml(line).replace(/〔([^〕]*)〕/g, '<span class="practice-blank">$1</span>');
      return '<div class="practice-code-line"><span class="practice-code-no">' + (i + 1) +
        '</span><span class="practice-code-src">' + src + '</span></div>';
    }).join('') + '</div>';
  }

  function init() {
    var app = document.getElementById('practice-app');
    var all = window.PRACTICE_QUESTIONS;
    if (!app || !all) return;
    var perSession = Number(app.dataset.perSession) || 5;

    // 分野は問題データに出てくる順に並べる
    var genres = [];
    all.forEach(function (q) {
      if (genres.indexOf(q.genre) < 0) genres.push(q.genre);
    });
    var selectedGenre = '';
    // 出題中の問題・何問目か・各問の正誤
    var session = null;

    function countOf(genre) {
      return all.filter(function (q) { return !genre || q.genre === genre; }).length;
    }

    function showStart() {
      var options = [''].concat(genres).map(function (g) {
        return '<label class="practice-genre"><input type="radio" name="practice-genre" value="' + escapeHtml(g) + '"' +
          (g === selectedGenre ? ' checked' : '') + '><span>' + (g ? escapeHtml(g) : 'すべての分野') +
          '</span><small>' + countOf(g) + '問</small></label>';
      }).join('');
      app.innerHTML =
        '<div class="practice-card">' +
        '<div class="practice-label">出題する分野</div>' +
        '<div class="practice-genres">' + options + '</div>' +
        '<button type="button" class="practice-btn" data-action="start">' + perSession + '問 解く</button>' +
        '</div>';
    }

    function start() {
      var checked = app.querySelector('input[name="practice-genre"]:checked');
      if (checked) selectedGenre = checked.value;
      var pool = all.filter(function (q) { return !selectedGenre || q.genre === selectedGenre; });
      session = { questions: shuffle(pool).slice(0, perSession), index: 0, results: [] };
      showQuestion();
    }

    function showQuestion() {
      var q = session.questions[session.index];
      var total = session.questions.length;
      var correct = session.results.filter(Boolean).length;
      app.innerHTML =
        '<div class="practice-progress"><span>' + (session.index + 1) + ' / ' + total + '問目</span><span>' + correct + '問 正解</span></div>' +
        '<div class="practice-bar"><i style="width:' + (session.index / total * 100) + '%"></i></div>' +
        '<div class="practice-card">' +
        '<div class="practice-q-head"><span>問' + (session.index + 1) + '</span><span class="practice-tag">' + escapeHtml(q.genre) + '</span></div>' +
        '<p class="practice-q">' + escapeHtml(q.question) + '</p>' +
        (q.code ? codeHtml(q.code) : '') +
        '<div class="practice-choices">' + q.choices.map(function (c, i) {
          return '<button type="button" data-action="answer" data-choice="' + i + '">' + escapeHtml(c) + '</button>';
        }).join('') + '</div>' +
        '<div class="practice-answer" aria-live="polite"></div>' +
        '</div>';
      window.scrollTo(0, app.getBoundingClientRect().top + window.pageYOffset - 16);
    }

    function answer(picked) {
      var q = session.questions[session.index];
      var ok = picked === q.answer;
      session.results.push(ok);
      app.querySelectorAll('.practice-choices button').forEach(function (b, i) {
        b.disabled = true;
        if (i === q.answer) b.classList.add('is-correct');
        else if (i === picked) b.classList.add('is-wrong');
      });
      var last = session.index + 1 === session.questions.length;
      app.querySelector('.practice-answer').innerHTML =
        '<div class="practice-result">' +
        (ok ? '<span class="practice-ok">○ 正解</span>' : '<span class="practice-ng">× 不正解</span>(正解は ' + KANA[q.answer] + ')') +
        '</div>' +
        '<p class="practice-explain">' + escapeHtml(q.explanation) + '</p>' +
        '<div class="practice-nav"><button type="button" class="practice-btn" data-action="' + (last ? 'finish' : 'next') + '">' +
        (last ? '結果を見る' : '次の問題 ›') + '</button></div>';
    }

    function showResult() {
      var total = session.questions.length;
      var correct = session.results.filter(Boolean).length;
      app.innerHTML =
        '<div class="practice-card practice-summary">' +
        '<div class="practice-label">結果</div>' +
        '<div class="practice-score">' + correct + ' / ' + total + '</div>' +
        '<ul>' + session.questions.map(function (q, i) {
          // 「〜を選べ。」の指示文ではなく、問題の内容を説明している段落を一覧の見出しにする
          var lines = q.question.split('\n').filter(Boolean);
          var title = lines.filter(function (l) { return !/選べ。$/.test(l); })[0] || lines[0];
          return '<li>' + (session.results[i] ? '<span class="practice-ok">○</span>' : '<span class="practice-ng">×</span>') +
            '<span>問' + (i + 1) + '</span><span class="practice-summary-q">' + escapeHtml(title) + '</span></li>';
        }).join('') + '</ul>' +
        '<button type="button" class="practice-btn" data-action="start">もう一度' + perSession + '問 解く</button>' +
        '<button type="button" class="practice-btn is-sub" data-action="top">分野を選び直す</button>' +
        '</div>';
    }

    app.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-action]');
      if (!btn || btn.disabled) return;
      switch (btn.dataset.action) {
        case 'start': start(); break;
        case 'answer': answer(Number(btn.dataset.choice)); break;
        case 'next': session.index++; showQuestion(); break;
        case 'finish': showResult(); break;
        case 'top': showStart(); break;
      }
    });

    showStart();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
