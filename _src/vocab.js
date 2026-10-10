  /* ============================================================
     ことばの なかま（色は AAC で よく つかわれる 考え方に そろえる）
     ============================================================ */
  const ROLES = {
    person: { n: 'ひと', e: '🧑', c: '#FFD43B', bg: '#FFF9DB' },
    thing: { n: 'もの', e: '🧸', c: '#FF922B', bg: '#FFF4E6' },
    place: { n: 'ばしょ', e: '📍', c: '#9775FA', bg: '#F3F0FF' },
    action: { n: 'したい', e: '🏃', c: '#40C057', bg: '#EBFBEE' },
    feeling: { n: 'きもち', e: '😊', c: '#339AF0', bg: '#E7F5FF' },
    social: { n: 'こたえ・あいさつ', e: '💬', c: '#F06595', bg: '#FFF0F6' }
  };
  /* ことば 1つ：
     w：カードの 字　e：えもじ　role：なかま
     polite / plain：「したい・きもち・こたえ」の ていねい／ふつうの いいかた（なければ w）
     call：ひと を よびかけに する（「○○せんせい、」）。false なら「わたしは」の ように 主語
     obj：したい が とる ことば と 助詞 { place:'に', thing:'を', person:'と' }（なければ ふつうの 助詞）
     msg：1まいで つたえる ときの 文（なければ 自動）
     u：いそぎ */
  const VOCAB = [
    // ひと
    { id: 'p-watashi', role: 'person', e: '🙋', w: 'わたし', call: false },
    { id: 'p-sensei', role: 'person', e: '🧑‍🏫', w: 'せんせい', call: true },
    { id: 'p-tomodachi', role: 'person', e: '🧑‍🤝‍🧑', w: 'ともだち', call: true },
    { id: 'p-okaasan', role: 'person', e: '👩', w: 'おかあさん', call: true },
    { id: 'p-otousan', role: 'person', e: '👨', w: 'おとうさん', call: true },
    { id: 'p-minna', role: 'person', e: '👨‍👩‍👧', w: 'みんな', call: true },
    // ばしょ
    { id: 'pl-toilet', role: 'place', e: '🚻', w: 'トイレ', u: true },
    { id: 'pl-hoken', role: 'place', e: '🩹', w: 'ほけんしつ' },
    { id: 'pl-soto', role: 'place', e: '🌳', w: 'そと' },
    { id: 'pl-kyoshitsu', role: 'place', e: '🏫', w: 'きょうしつ' },
    { id: 'pl-taiikukan', role: 'place', e: '🤸', w: 'たいいくかん' },
    { id: 'pl-shokudo', role: 'place', e: '🍽️', w: 'しょくどう' },
    { id: 'pl-ouchi', role: 'place', e: '🏠', w: 'おうち' },
    { id: 'pl-koen', role: 'place', e: '🛝', w: 'こうえん' },
    { id: 'pl-mizunomi', role: 'place', e: '🚰', w: 'みずのみば' },
    // もの
    { id: 't-ocha', role: 'thing', e: '🍵', w: 'おちゃ' },
    { id: 't-mizu', role: 'thing', e: '💧', w: 'みず' },
    { id: 't-juice', role: 'thing', e: '🧃', w: 'ジュース' },
    { id: 't-oyatsu', role: 'thing', e: '🍪', w: 'おやつ' },
    { id: 't-gohan', role: 'thing', e: '🍚', w: 'ごはん' },
    { id: 't-pan', role: 'thing', e: '🍞', w: 'パン' },
    { id: 't-tablet', role: 'thing', e: '📱', w: 'タブレット' },
    { id: 't-ehon', role: 'thing', e: '📖', w: 'えほん' },
    { id: 't-ball', role: 'thing', e: '⚽', w: 'ボール' },
    { id: 't-tsumiki', role: 'thing', e: '🧱', w: 'つみき' },
    { id: 't-tv', role: 'thing', e: '📺', w: 'テレビ' },
    { id: 't-ongaku', role: 'thing', e: '🎵', w: 'おんがく' },
    { id: 't-tissue', role: 'thing', e: '🧻', w: 'ティッシュ' },
    { id: 't-towel', role: 'thing', e: '🧺', w: 'タオル' },
    { id: 't-kusuri', role: 'thing', e: '💊', w: 'くすり' },
    { id: 't-enpitsu', role: 'thing', e: '✏️', w: 'えんぴつ' },
    { id: 't-hasami', role: 'thing', e: '✂️', w: 'はさみ' },
    // からだ（「あたま」＋「いたい」→「あたまが いたいです」）
    { id: 'b-atama', role: 'thing', e: '🧠', w: 'あたま', body: true },
    { id: 'b-onaka', role: 'thing', e: '🫄', w: 'おなか', body: true },
    { id: 'b-te', role: 'thing', e: '✋', w: 'て', body: true },
    { id: 'b-ashi', role: 'thing', e: '🦶', w: 'あし', body: true },
    { id: 'b-ha', role: 'thing', e: '🦷', w: 'は', body: true },
    { id: 'b-me', role: 'thing', e: '👁️', w: 'め', body: true },
    // したい
    { id: 'a-ikitai', role: 'action', e: '🚶', w: 'いきたい', polite: 'いきたいです', obj: { place: 'に' } },
    { id: 'a-kaeritai', role: 'action', e: '🏡', w: 'かえりたい', polite: 'かえりたいです', obj: { place: 'に' } },
    { id: 'a-tabetai', role: 'action', e: '🍽️', w: 'たべたい', polite: 'たべたいです', obj: { thing: 'を' } },
    { id: 'a-nomitai', role: 'action', e: '🥤', w: 'のみたい', polite: 'のみたいです', obj: { thing: 'を' } },
    { id: 'a-hoshii', role: 'action', e: '🤲', w: 'ほしい', polite: 'ほしいです', obj: { thing: 'が' } },
    { id: 'a-yaritai', role: 'action', e: '✋', w: 'やりたい', polite: 'やりたいです', obj: { thing: 'を' } },
    { id: 'a-asobitai', role: 'action', e: '🧸', w: 'あそびたい', polite: 'あそびたいです', obj: { thing: 'で', place: 'で', person: 'と' } },
    { id: 'a-aitai', role: 'action', e: '🫂', w: 'あいたい', polite: 'あいたいです', obj: { person: 'に' } },
    { id: 'a-hanashitai', role: 'action', e: '🗣️', w: 'はなしたい', polite: 'はなしたいです', obj: { person: 'と' } },
    { id: 'a-mitai', role: 'action', e: '👀', w: 'みたい', polite: 'みたいです', obj: { thing: 'を' } },
    { id: 'a-kashite', role: 'action', e: '🙏', w: 'かして', polite: 'かしてください', obj: { thing: 'を' } },
    { id: 'a-choudai', role: 'action', e: '🤲', w: 'ちょうだい', polite: 'ください', obj: { thing: 'を' } },
    { id: 'a-tetsudatte', role: 'action', e: '🤝', w: 'てつだって', polite: 'てつだってください', obj: {} },
    { id: 'a-yasumitai', role: 'action', e: '🛋️', w: 'やすみたい', polite: 'やすみたいです', obj: { place: 'で' } },
    { id: 'a-yametai', role: 'action', e: '🛑', w: 'やめたい', polite: 'やめたいです', obj: { thing: 'を' } },
    { id: 'a-matte', role: 'action', e: '✋', w: 'まって', polite: 'まってください', obj: {} },
    { id: 'a-mouikkai', role: 'action', e: '🔁', w: 'もういっかい', polite: 'もういっかい やりたいです', obj: { thing: 'を' } },
    { id: 'a-owari', role: 'action', e: '🏁', w: 'おわり', polite: 'おわりに したいです', obj: {} },
    { id: 'a-motto', role: 'action', e: '➕', w: 'もっと', polite: 'もっと ほしいです', obj: { thing: 'が' } },
    // きもち
    { id: 'f-ureshii', role: 'feeling', e: '😊', w: 'うれしい', polite: 'うれしいです' },
    { id: 'f-tanoshii', role: 'feeling', e: '😆', w: 'たのしい', polite: 'たのしいです' },
    { id: 'f-kanashii', role: 'feeling', e: '😢', w: 'かなしい', polite: 'かなしいです' },
    { id: 'f-iya', role: 'feeling', e: '😣', w: 'いや', polite: 'いやです' },
    { id: 'f-kowai', role: 'feeling', e: '😨', w: 'こわい', polite: 'こわいです' },
    { id: 'f-itai', role: 'feeling', e: '🤕', w: 'いたい', polite: 'いたいです', u: true },
    { id: 'f-tsukareta', role: 'feeling', e: '😩', w: 'つかれた', polite: 'つかれました' },
    { id: 'f-nemui', role: 'feeling', e: '😪', w: 'ねむい', polite: 'ねむいです' },
    { id: 'f-atsui', role: 'feeling', e: '🥵', w: 'あつい', polite: 'あついです' },
    { id: 'f-samui', role: 'feeling', e: '🥶', w: 'さむい', polite: 'さむいです' },
    { id: 'f-onaka', role: 'feeling', e: '🍽️', w: 'おなか すいた', polite: 'おなかが すきました' },
    { id: 'f-kimochiwarui', role: 'feeling', e: '🤢', w: 'きもち わるい', polite: 'きもちが わるいです', u: true },
    // こたえ・あいさつ
    { id: 's-hai', role: 'social', e: '⭕', w: 'はい' },
    { id: 's-iie', role: 'social', e: '❌', w: 'いいえ' },
    { id: 's-arigatou', role: 'social', e: '🙏', w: 'ありがとう', polite: 'ありがとうございます' },
    { id: 's-gomen', role: 'social', e: '🙇', w: 'ごめんなさい' },
    { id: 's-ohayou', role: 'social', e: '🌅', w: 'おはよう', polite: 'おはようございます' },
    { id: 's-sayounara', role: 'social', e: '👋', w: 'さようなら' },
    { id: 's-wakaranai', role: 'social', e: '❓', w: 'わからない', polite: 'わかりません' },
    { id: 's-iiyo', role: 'social', e: '👌', w: 'いいよ', polite: 'いいですよ' },
    { id: 's-tasukete', role: 'social', e: '🆘', w: 'たすけて', polite: 'たすけてください', u: true }
  ];
  // 段階ごとの はじめの カード（先生が かえられる）
  const DEFAULT_LEVELS = {
    1: { cards: ['pl-toilet', 't-ocha'] },
    2: { slots: [['pl-toilet', 't-ocha', 'pl-soto', 't-tablet'], ['a-ikitai', 'a-nomitai', 'a-yaritai', 'a-hoshii']] },
    3: { slots: [['p-sensei', 'p-tomodachi', 'p-okaasan'], ['pl-toilet', 't-ocha', 'pl-soto', 't-tablet', 't-ehon', 't-oyatsu'], ['a-ikitai', 'a-nomitai', 'a-tabetai', 'a-yaritai', 'a-hoshii', 'a-kashite']] }
  };
  const SLOT_NAMES = { 2: ['なに・どこ？', 'どうしたい？'], 3: ['だれに？', 'なに・どこ？', 'どうしたい？'] };
  // じゆうに の「⭐ よく つかう」（コア語彙：どの 場面でも つかえる ことば）
  const DEFAULT_FAV = ['p-watashi', 'p-sensei', 'pl-toilet', 't-ocha', 'a-ikitai', 'a-nomitai', 'a-hoshii', 'a-yaritai', 'a-tetsudatte', 'a-matte', 'a-motto', 'a-owari', 'f-iya', 'f-itai', 's-hai', 's-iie', 's-arigatou', 's-wakaranai'];
  const URGENT = ['pl-toilet', 'f-itai', 's-tasukete', 'a-yasumitai'];
