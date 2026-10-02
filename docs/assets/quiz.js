/*
 * 資格学習のまとめ(docs/)の「練習問題」を動かすスクリプト(front#167)。
 * - GitHub Pages: 各ページの <script src="../assets/quiz.js"> で読み込む
 * - アプリ: 本文は innerHTML で差し込むため本文中の <script> は実行されない。angular.json の scripts で読み込む
 * どちらでも後から差し込まれた本文で動くよう、クリックは document でまとめて受け取り(イベント委譲)、
 * 仕訳の入力欄は .quiz-journal が現れた時点で組み立てる。書き方は docs/README.md を参照。
 */
(function () {
  if (window.__docsQuizLoaded) return;
  window.__docsQuizLoaded = true;

  var KANA = 'アイウエオカ';

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function formatAmount(n) {
    return Number(n).toLocaleString('ja-JP');
  }

  // "仕入:60000,買掛金:60000" → [{ account: '仕入', amount: 60000 }, ...]
  function parseLines(s) {
    return (s || '').split(',').filter(Boolean).map(function (x) {
      var parts = x.split(':');
      return { account: parts[0].trim(), amount: Number(parts[1]) };
    });
  }

  // 全角数字・カンマ・「円」を許して金額を読む。空欄は null
  function parseAmount(s) {
    var t = String(s)
      .replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xfee0); })
      .replace(/[,，円\s]/g, '');
    return t === '' ? null : Number(t);
  }

  // 仕訳の入力欄(借方・貸方それぞれ、勘定科目の選択 + 金額の入力)を組み立てる
  function buildJournal(quiz) {
    var accounts = (quiz.dataset.accounts || '').split(',').filter(Boolean);
    var rows = Math.max(2, parseLines(quiz.dataset.debit).length, parseLines(quiz.dataset.credit).length);
    var options = '<option value="">(勘定科目)</option>' + accounts.map(function (a) {
      return '<option>' + escapeHtml(a.trim()) + '</option>';
    }).join('');
    function side(label, key) {
      var html = '<div class="journal-side" data-side="' + key + '"><div class="journal-side-name">' + label + '</div>';
      for (var i = 0; i < rows; i++) {
        html += '<div class="journal-row"><select aria-label="' + label + 'の勘定科目' + (i + 1) + '">' + options +
          '</select><input type="text" inputmode="numeric" autocomplete="off" placeholder="金額" aria-label="' + label + 'の金額' + (i + 1) + '"></div>';
      }
      return html + '</div>';
    }
    var box = quiz.querySelector('.journal');
    if (box) box.innerHTML = side('借方', 'debit') + side('貸方', 'credit');
    quiz.classList.add('is-ready');
  }

  function initAll(root) {
    var list = (root || document).querySelectorAll('.quiz-journal:not(.is-ready)');
    for (var i = 0; i < list.length; i++) buildJournal(list[i]);
  }

  function updateScore(practice) {
    if (!practice) return;
    var score = practice.querySelector('.practice-score');
    if (!score) return;
    var all = practice.querySelectorAll('.quiz').length;
    var ok = practice.querySelectorAll('.quiz[data-result="ok"]').length;
    score.textContent = ok + ' / ' + all + '問 正解';
  }

  function showResult(quiz, ok, detailHtml) {
    quiz.dataset.result = ok ? 'ok' : 'ng';
    var result = quiz.querySelector('.quiz-result');
    if (result) {
      result.innerHTML = (ok ? '<b class="quiz-ok">○ 正解</b>' : '<b class="quiz-ng">× 不正解</b>' + detailHtml) +
        '<button type="button" class="quiz-retry">もう一度</button>';
      result.hidden = false;
    }
    var explain = quiz.querySelector('.quiz-explain');
    if (explain) explain.hidden = false;
    updateScore(quiz.closest('.practice'));
  }

  function answerChoice(button) {
    var quiz = button.closest('.quiz');
    if (!quiz || quiz.dataset.result) return;
    var buttons = Array.prototype.slice.call(quiz.querySelectorAll('.quiz-choices button'));
    var answer = Number(quiz.dataset.answer);
    var chosen = buttons.indexOf(button);
    buttons.forEach(function (b, i) {
      b.disabled = true;
      if (i === answer) b.classList.add('is-correct');
    });
    if (chosen !== answer) button.classList.add('is-wrong');
    showResult(quiz, chosen === answer, '(正解は ' + KANA.charAt(answer) + ')');
  }

  function checkJournal(quiz) {
    if (quiz.dataset.result) return;
    var allOk = true;
    ['debit', 'credit'].forEach(function (key) {
      var rest = parseLines(quiz.dataset[key]);
      var rows = quiz.querySelectorAll('[data-side="' + key + '"] .journal-row');
      Array.prototype.forEach.call(rows, function (row) {
        var account = row.querySelector('select').value;
        var amount = parseAmount(row.querySelector('input').value);
        if (!account && amount === null) return; // 使わない行
        var index = -1;
        for (var i = 0; i < rest.length; i++) {
          if (rest[i].account === account && rest[i].amount === amount) { index = i; break; }
        }
        var ok = index >= 0;
        if (ok) rest.splice(index, 1); else allOk = false;
        row.classList.add(ok ? 'is-correct' : 'is-wrong');
      });
      if (rest.length > 0) allOk = false; // 足りない行がある
    });
    Array.prototype.forEach.call(quiz.querySelectorAll('.journal select, .journal input'), function (el) { el.disabled = true; });
    var check = quiz.querySelector('.quiz-check');
    if (check) check.hidden = true;
    function answerText(key) {
      return parseLines(quiz.dataset[key]).map(function (l) {
        return escapeHtml(l.account) + ' ' + formatAmount(l.amount);
      }).join('、');
    }
    showResult(quiz, allOk, '<span class="quiz-answer">正しい仕訳: (借方)' + answerText('debit') + ' / (貸方)' + answerText('credit') + '</span>');
  }

  function retry(quiz) {
    delete quiz.dataset.result;
    Array.prototype.forEach.call(quiz.querySelectorAll('.quiz-choices button'), function (b) {
      b.disabled = false;
      b.classList.remove('is-correct', 'is-wrong');
    });
    Array.prototype.forEach.call(quiz.querySelectorAll('.journal-row'), function (row) {
      row.classList.remove('is-correct', 'is-wrong');
    });
    Array.prototype.forEach.call(quiz.querySelectorAll('.journal select, .journal input'), function (el) { el.disabled = false; });
    var check = quiz.querySelector('.quiz-check');
    if (check) check.hidden = false;
    var result = quiz.querySelector('.quiz-result');
    if (result) { result.hidden = true; result.innerHTML = ''; }
    var explain = quiz.querySelector('.quiz-explain');
    if (explain) explain.hidden = true;
    updateScore(quiz.closest('.practice'));
  }

  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    var choice = target.closest('.quiz-choices button');
    if (choice) { answerChoice(choice); return; }
    var check = target.closest('.quiz-check');
    if (check) { checkJournal(check.closest('.quiz')); return; }
    var again = target.closest('.quiz-retry');
    if (again) retry(again.closest('.quiz'));
  });

  // 金額の入力欄で Enter を押したら答え合わせする
  document.addEventListener('keydown', function (e) {
    var target = e.target;
    if (e.key !== 'Enter' || !(target instanceof Element) || !target.matches('.journal input')) return;
    e.preventDefault();
    checkJournal(target.closest('.quiz'));
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(document); });
  } else {
    initAll(document);
  }
  // アプリではジャンルを切り替えるたびに本文が差し替わるので、新しく現れた仕訳問題も組み立てる
  new MutationObserver(function () { initAll(document); })
    .observe(document.documentElement, { childList: true, subtree: true });
})();
