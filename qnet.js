/*
 * 모의고사 응답 통신 (교사 수업 HTML ↔ 학생 페이지)
 * 데이터: mock-quiz/rooms/{4자리 코드}
 *   meta    { createdAt, title }
 *   state   { qid, label, kind:'ox'|'mc', labels:[...], open, seq }   ← 교사만 씀
 *   players { [pid]: { online } }                                     ← 학생
 *   answers { [qid]: { [pid]: { a:'OXO' | '3', t } } }               ← 학생
 * qid는 '3-04', '10-25'처럼 ASCII로 쓴다.
 * 주소에 ?net=local 이 있으면 Firebase 없이 같은 브라우저 탭끼리 통신한다(테스트용).
 */
(function (g) {
  'use strict';
  const CONFIG = {
    apiKey: 'AIzaSyA0M6vVi_AGnlckqrTrdXmeXaRnocYfegY',
    authDomain: 'science-arcade-7388.firebaseapp.com',
    databaseURL: 'https://science-arcade-7388-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'science-arcade-7388',
    storageBucket: 'science-arcade-7388.firebasestorage.app',
    messagingSenderId: '620561307547',
    appId: '1:620561307547:web:0e04b6fbbf92e1cdd1f33e',
  };
  const ROOT = 'mock-quiz/rooms';
  const SDK = ['https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
               'https://www.gstatic.com/firebasejs/10.14.1/firebase-database-compat.js'];
  const isLocal = () => new URLSearchParams(location.search).get('net') === 'local';

  function loadScript(src) {
    return new Promise((res, rej) => {
      if ([...document.scripts].some(s => s.src === src)) return res();
      const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load ' + src));
      document.head.appendChild(s);
    });
  }

  /* ---------- Firebase ---------- */
  class FB {
    constructor() { if (!firebase.apps.length) firebase.initializeApp(CONFIG); this.db = firebase.database(); this.off = 0;
      this.db.ref('.info/serverTimeOffset').on('value', s => { this.off = s.val() || 0; }); }
    now() { return Date.now() + this.off; }
    room(code) { return new FBRoom(this, code); }
    async cleanup() {
      const old = await this.db.ref(ROOT).orderByChild('meta/createdAt').endAt(this.now() - 12 * 3600e3).get();
      const u = {}; old.forEach(s => { u[s.key] = null; }); if (Object.keys(u).length) await this.db.ref(ROOT).update(u);
    }
  }
  class FBRoom {
    constructor(b, code) { this.b = b; this.code = code; this.ref = b.db.ref(`${ROOT}/${code}`); }
    async exists() { return (await this.ref.child('meta').get()).exists(); }
    create(meta) { return this.ref.set({ meta }); }
    setState(st) { return this.ref.child('state').set(st); }
    onState(cb) { const h = this.ref.child('state').on('value', s => cb(s.val())); return () => this.ref.child('state').off('value', h); }
    onPlayers(cb) { const h = this.ref.child('players').on('value', s => cb(s.val() || {})); return () => this.ref.child('players').off('value', h); }
    onAnswers(cb) { const h = this.ref.child('answers').on('value', s => cb(s.val() || {})); return () => this.ref.child('answers').off('value', h); }
    async join(pid) {
      const r = this.ref.child(`players/${pid}`);
      this.b.db.ref('.info/connected').on('value', s => { if (!s.val()) return; r.child('online').onDisconnect().set(false); r.child('online').set(true); });
    }
    submit(qid, pid, a) { return this.ref.child(`answers/${qid}/${pid}`).set({ a, t: this.b.now() }); }
    destroy() { return this.ref.remove(); }
  }

  /* ---------- 로컬 테스트 ---------- */
  class LB {
    constructor() { this.ls = new Set(); addEventListener('storage', e => { if (e.key && e.key.startsWith('mqdb:')) this.emit(e.key.slice(5)); }); }
    now() { return Date.now(); }
    room(code) { return new LRoom(this, code); }
    cleanup() { return Promise.resolve(); }
    get(p) { const v = localStorage.getItem('mqdb:' + p); return v == null ? null : JSON.parse(v); }
    set(p, v) { if (v == null) localStorage.removeItem('mqdb:' + p); else localStorage.setItem('mqdb:' + p, JSON.stringify(v)); this.emit(p); }
    keys(pre) { const o = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('mqdb:' + pre)) o.push(k.slice(5)); } return o; }
    tree(pre) { const o = {}; this.keys(pre).forEach(k => { const parts = k.slice(pre.length).split('/'); let c = o; parts.slice(0, -1).forEach(p => { c = c[p] = c[p] || {}; }); c[parts.at(-1)] = this.get(k); }); return o; }
    emit(p) { this.ls.forEach(l => { if (p.startsWith(l.pre)) setTimeout(() => l.cb(), 0); }); }
    on(pre, cb) { const l = { pre, cb }; this.ls.add(l); return () => this.ls.delete(l); }
  }
  class LRoom {
    constructor(b, code) { this.b = b; this.code = code; this.base = `${ROOT}/${code}/`; }
    async exists() { return this.b.get(this.base + 'meta') != null; }
    async create(meta) { this.destroy(); this.b.set(this.base + 'meta', meta); }
    async setState(st) { this.b.set(this.base + 'state', st); }
    onState(cb) { const f = () => cb(this.b.get(this.base + 'state')); f(); return this.b.on(this.base + 'state', f); }
    onPlayers(cb) { const f = () => cb(this.b.tree(this.base + 'players/')); f(); return this.b.on(this.base + 'players/', f); }
    onAnswers(cb) { const f = () => cb(this.b.tree(this.base + 'answers/')); f(); return this.b.on(this.base + 'answers/', f); }
    async join(pid) { this.b.set(this.base + 'players/' + pid, { online: true }); addEventListener('beforeunload', () => this.b.set(this.base + 'players/' + pid, { online: false })); }
    async submit(qid, pid, a) { this.b.set(`${this.base}answers/${qid}/${pid}`, { a, t: Date.now() }); }
    async destroy() { this.b.keys(this.base).forEach(k => localStorage.removeItem('mqdb:' + k)); }
  }

  let backend = null;
  async function connect() {
    if (backend) return backend;
    if (isLocal()) return (backend = new LB());
    for (const s of SDK) await loadScript(s);
    return (backend = new FB());
  }
  g.QNet = { connect, isLocal, loadScript, qkey: q => q.replace('월_', '-') };
})(window);
