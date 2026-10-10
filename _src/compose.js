  /* ============================================================
     文を つくる（助詞と ていねいな いいかたを おぎなう）
     compose([カード…], { polite })  → 'やまだせんせい、トイレに いきたいです'
     single(カード, polite)          → 1まいで つたえる ときの 文
     ============================================================ */
  const NOUN = { person: 1, thing: 1, place: 1 };
  // したい・きもち が とる 助詞（カードに obj が なければ これ）
  const PART_DEFAULT = {
    action: { place: 'に', thing: 'を', person: 'に' },
    feeling: { place: 'が', thing: 'が', person: 'が' }
  };
  const formOf = (c, polite) => polite ? (c.polite || c.w) : (c.plain || c.w);
  function single(c, polite) {
    if (!c) return '';
    if (c.msg) return c.msg;
    const P = polite !== false;
    if (c.role === 'place') return c.w + (P ? 'に いきたいです' : 'に いきたい');
    if (c.role === 'thing') return c.body ? c.w + (P ? 'が いたいです' : 'が いたい') : c.w + (P ? 'が ほしいです' : 'が ほしい');
    if (c.role === 'person') return c.call === false ? c.w : c.w + (P ? '、きてください' : '、きて');
    return formOf(c, P);
  }
  function particle(c, nx) {
    if (!nx) return '';
    if (nx.role === 'action' || nx.role === 'feeling') {
      const o = nx.obj || {};
      if (o[c.role] != null) return o[c.role];
      return (PART_DEFAULT[nx.role] || {})[c.role] || '';
    }
    if (NOUN[nx.role]) {
      if (nx.role === c.role) return 'と';                   // おちゃと パン
      if (c.role === 'place' && nx.role === 'thing') return 'で'; // そとで ボール…
      return '';
    }
    return '、';
  }
  // 1まい ずつの ことば（助詞つき）。文字の 色分け表示にも つかう
  function composeParts(list, opt) {
    const cards = (list || []).filter(Boolean), P = !opt || opt.polite !== false;
    return cards.map((c, i) => {
      const nx = cards[i + 1];
      let t;
      if (c.role === 'person') {
        if (c.call === false) t = c.w + (nx ? 'は' : '');   // わたしは
        else if (i === 0 && nx) t = c.w + '、';             // よびかけ
        else t = c.w + particle(c, nx);
      } else if (NOUN[c.role]) t = c.w + particle(c, nx);
      else t = formOf(c, P) + (nx && c.role === 'social' ? '、' : '');
      return { c, t };
    });
  }
  function compose(list, opt) {
    return composeParts(list, opt).map(x => x.t).join(' ').replace(/、 /g, '、').replace(/ +/g, ' ').trim();
  }
