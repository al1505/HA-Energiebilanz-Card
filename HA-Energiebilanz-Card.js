const EB_VERSION = "4.6";
console.info(`%c ENERGIEBILANZ-CARD %c v${EB_VERSION} (Enterprise Edition) `, "color: white; background: #3182b7; font-weight: bold;", "color: #3182b7; background: white; font-weight: bold;");

const TRANSLATIONS = {
  'de': {
    'heute': 'Heute', 'live': 'Live', 'gesamt': 'Gesamt',
    'zufluss': 'Zufluss', 'verbrauch': 'Verbrauch',
    'photovoltaik': 'Photovoltaik', 'netzbezug': 'Netzbezug', 'einspeisung': 'Einspeisung',
    'bat_ent': 'Bat. Entladen', 'bat_lad': 'Bat. Laden', 'haus': 'Hausverbrauch',
    'haus_gesamt': 'Hausverbrauch (Gesamt)', 'pv_gesamt': 'PV Gesamt', 'pv_direkt': 'PV Direkt',
    'autarkie': 'Autarkie', 'jetzt': 'JETZT', 'tag': 'Tag', 'monat': 'Monat', 'jahr': 'Jahr',
    'temperatur': 'Temperatur',
    'header_design': 'Design & Layout', 'header_lang': 'Sprache & Texte', 'header_main': 'Haupt-Sensoren',
    'header_pv_subs': 'Sub-Einträge Photovoltaik (max. 15)', 'header_haus_subs': 'Sub-Einträge Hausverbrauch (max. 15)',
    'lbl_name': 'Anzeige-Name', 'lbl_icon': 'Icon (z.B. mdi:solar)', 'lbl_heute': 'Heute (kWh)', 'lbl_live': 'Live (W)',
    'lbl_dec_heute': 'Dez. Heute', 'lbl_dec_live': 'Dez. Live', 'lbl_width_heute': 'Breite Heute', 'lbl_width_live': 'Breite Live',
    'lbl_color_main': 'Farbe Haupt-Werte', 'lbl_color_sub': 'Farbe Sub-Werte',
    'rest_haus': 'Restl. Haus', 'details': 'Details', 'colors_light': 'Farbe (Standard / Light Mode)', 'colors_dark': 'Farbe (Dark Mode)'
  },
  'en': {
    'heute': 'Today', 'live': 'Live', 'gesamt': 'Total',
    'zufluss': 'Inflow', 'verbrauch': 'Consumption',
    'photovoltaik': 'Solar Prod.', 'netzbezug': 'Grid Import', 'einspeisung': 'Grid Export',
    'bat_ent': 'Bat. Discharge', 'bat_lad': 'Bat. Charge', 'haus': 'House Cons.',
    'haus_gesamt': 'House (Total)', 'pv_gesamt': 'PV Total', 'pv_direkt': 'PV Direct',
    'autarkie': 'Autarky', 'jetzt': 'NOW', 'tag': 'Day', 'monat': 'Month', 'jahr': 'Year',
    'temperatur': 'Temperature',
    'header_design': 'Design & Layout', 'header_lang': 'Language & Texts', 'header_main': 'Main Sensors',
    'header_pv_subs': 'Sub-entries Solar (max. 15)', 'header_haus_subs': 'Sub-entries House (max. 15)',
    'lbl_name': 'Display Name', 'lbl_icon': 'Icon (e.g. mdi:solar)', 'lbl_heute': 'Today (kWh)', 'lbl_live': 'Live (W)',
    'lbl_dec_heute': 'Dec. Today', 'lbl_dec_live': 'Dec. Live', 'lbl_width_heute': 'Width Today', 'lbl_width_live': 'Width Live',
    'lbl_color_main': 'Main Value Color', 'lbl_color_sub': 'Sub Value Color',
    'rest_haus': 'Rest House', 'details': 'Details', 'colors_light': 'Color (Standard / Light Mode)', 'colors_dark': 'Color (Dark Mode)'
  }
};

// 🔒 XSS Protection Utility
const esc = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
};

window.customCards = window.customCards || [];
window.customCards.push({ type: "energiebilanz-card", name: "Energiebilanz", preview: true });

// =========================================================
// AREA 1: DATA ENGINE 
// =========================================================
class EB_DataEngine {
  static async fetchChartData(hass, level, targetDate, entities) {
    if (!entities || entities.length === 0) return {};
    
    let start, end, periodStr;
    const y = targetDate.getFullYear(), m = targetDate.getMonth(), d = targetDate.getDate();

    if (level === 'total') { start = new Date(2020, 0, 1); end = new Date(y, 11, 31, 23, 59, 59); periodStr = 'month'; }
    else if (level === 'year') { start = new Date(y, 0, 1); end = new Date(y, 11, 31, 23, 59, 59); periodStr = 'month'; } 
    else if (level === 'month') { start = new Date(y, m, 1); end = new Date(y, m + 1, 0, 23, 59, 59); periodStr = 'day'; } 
    else { start = new Date(y, m, d); end = new Date(y, m, d, 23, 59, 59); periodStr = 'hour'; }

    let fetchStart = new Date(start);
    if (level === 'total') fetchStart = new Date(2019, 11, 1);
    else if (level === 'year') fetchStart.setMonth(fetchStart.getMonth() - 1);
    else if (level === 'month') fetchStart.setDate(fetchStart.getDate() - 1);
    else fetchStart.setHours(fetchStart.getHours() - 1);

    try {
      const res = await hass.callWS({ type: 'recorder/statistics_during_period', start_time: fetchStart.toISOString(), end_time: end.toISOString(), statistic_ids: entities, period: periodStr, types: ['change', 'sum', 'state', 'mean'] });
      const results = {};
      entities.forEach(ent => {
        results[ent] = [];
        if (res[ent]) {
          res[ent].forEach((p, idx) => {
            let changeVal = (p.change !== undefined && p.change !== null) ? p.change : 0;
            let sumDiff = (idx > 0 && p.sum !== null && res[ent][idx-1].sum !== null) ? p.sum - res[ent][idx-1].sum : 0;
            let stateDiff = 0;
            if (idx > 0 && p.state !== null && res[ent][idx-1].state !== null) { stateDiff = p.state - res[ent][idx-1].state; if (stateDiff < 0) stateDiff = parseFloat(p.state); }
            let val = Math.max(changeVal, sumDiff, stateDiff);
            let meanVal = (p.mean !== undefined && p.mean !== null) ? p.mean : (p.state !== null ? p.state : 0);
            if (new Date(p.start) >= start) { results[ent].push({ ts: p.start, val: Math.max(0, val), mean: meanVal }); }
          });
        }
      });
      return { data: results, start: start, end: end, periodStr: periodStr };
    } catch (e) { return "error"; }
  }
}

// =========================================================
// AREA 2: VISUAL EDITOR (Light DOM, Scoped CSS)
// =========================================================
class EnergiebilanzCardEditor extends HTMLElement {
  constructor() { super(); this._config = {}; this._openedDetails = new Set(); this._initialized = false; }
  
  setConfig(config) { 
      const oldKeys = Object.keys(this._config || {}).length;
      const newKeys = Object.keys(config || {}).length;
      this._config = { ...config }; 
      if (!this._initialized || oldKeys !== newKeys) { this.buildDOM(); this._initialized = true; } 
      else {
          this.querySelectorAll('[config-key]').forEach(el => {
              const key = el.getAttribute('config-key');
              let val = this._config[key]; if (val === undefined) val = '';
              if (el.value !== val) el.value = val;
          });
          this.querySelectorAll('ha-switch[config-key]').forEach(el => {
              const key = el.getAttribute('config-key');
              el.checked = this._config[key] || false;
          });
      }
  }

  set hass(hass) { this._hass = hass; if (!this._initialized) { this.buildDOM(); this._initialized = true; } this.querySelectorAll('ha-selector').forEach(el => el.hass = hass); }
  t(key) { const lang = this._hass && this._hass.language ? this._hass.language.split('-')[0] : 'de'; const map = TRANSLATIONS[lang] || TRANSLATIONS['en']; return this._config[`txt_${key}`] || map[key] || key; }

  buildDOM() {
    try {
      const getConf = (k, d) => (this._config && this._config[k] !== undefined) ? this._config[k] : d;
      this.querySelectorAll('details').forEach(det => { if (det.open) this._openedDetails.add(det.id); else this._openedDetails.delete(det.id); });
      
      this.innerHTML = `
        <div class="eb-editor-container" style="padding: 16px; margin-bottom: 20px;">
          <h2 style="margin-top:0; color: var(--primary-text-color);">Energiebilanz (v${EB_VERSION})</h2>
          <div id="design_container"></div>
          <h3 style="margin-top: 24px;">${esc(this.t('header_lang'))}</h3><div id="lang_options"></div>
          <h3 style="margin-top: 24px;">${esc(this.t('header_main'))}</h3><div id="main_sensors"></div>
          <h3 style="margin-top: 24px;">${esc(this.t('header_pv_subs'))}</h3><div id="pv_subs_container"></div>
          <h3 style="margin-top: 24px;">${esc(this.t('header_haus_subs'))}</h3><div id="haus_subs_container"></div>
        </div>
        <style>
          .eb-editor-container ha-textfield, .eb-editor-container ha-selector, .eb-editor-container ha-formfield { display: block; margin-bottom: 8px; margin-top: 4px; width: 100%; }
          .eb-editor-container .sub-details { margin-bottom: 8px; border: 1px solid var(--divider-color, #ccc); padding: 12px; border-radius: 6px; background: var(--card-background-color); position: relative; }
          .eb-editor-container .sub-summary { cursor: pointer; font-weight: bold; outline: none; padding: 4px 0; font-size: 1.05em; display: flex; align-items: center; justify-content: space-between;}
          .eb-editor-container .summary-icon { margin-right: 12px; transition: transform 0.3s; color: var(--secondary-text-color); }
          .eb-editor-container details[open] .summary-icon { transform: rotate(90deg); }
          .eb-editor-container .field-label { font-size: 12px; color: var(--secondary-text-color); margin-top: 14px; font-weight: bold; }
          .eb-editor-container .add-btn-wrap { display: flex; justify-content: center; margin: 15px 0; }
          .eb-editor-container .add-btn { background: var(--primary-color); color: white; border: none; border-radius: 4px; padding: 10px 20px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: bold; }
          .eb-editor-container .delete-btn { color: var(--error-color); cursor: pointer; margin-left: auto; padding: 4px; z-index: 2; }
          .eb-editor-container .flex-row { display: flex !important; flex-wrap: wrap !important; gap: 16px !important; align-items: end !important; margin-bottom: 8px !important; }
          .eb-editor-container .flex-row > * { flex: 1 1 200px !important; margin: 0 !important; }
          .eb-editor-container .color-row { display: flex; align-items: center; gap: 8px; }
          .eb-editor-container input[type="color"] { height: 32px; width: 32px; border: 1px solid var(--divider-color); border-radius: 4px; cursor: pointer; padding: 0; flex-shrink: 0; }
        </style>
      `;
      const designDet = this.createDetailsElement('design_options', this.t('header_design'), false); 
      const designTarget = designDet.querySelector('.content-target'); 
      this.querySelector('#design_container').appendChild(designDet);

      const createColorPicker = (key, label, defaultColor) => {
        let val = getConf(key, defaultColor);
        if (val === undefined || val === null) val = defaultColor;
        val = String(val);
        const safeColor = val.startsWith('#') ? val : '#ffffff';
        
        const div = document.createElement('div'); div.className = "color-row";
        div.innerHTML = `<input type="color" value="${esc(safeColor)}"><ha-textfield config-key="${key}" label="${esc(label)}" value="${esc(val)}" style="flex:1; margin:0;"></ha-textfield>`;
        const picker = div.querySelector('input'); const field = div.querySelector('ha-textfield');
        picker.oninput = e => { field.value = e.target.value; this.updateConfig(key, e.target.value); }; 
        field.onchange = e => { picker.value = e.target.value; this.updateConfig(key, e.target.value); }; 
        return div;
      };

      const g1 = document.createElement('div'); g1.className = "flex-row"; g1.appendChild(createColorPicker('color_zufluss_line', 'Box: Zufluss Linie', '#3182b7')); g1.appendChild(createColorPicker('color_zufluss_bg', 'Box: Zufluss HG', 'rgba(49, 130, 183, 0.08)')); designTarget.appendChild(g1);
      const g2 = document.createElement('div'); g2.className = "flex-row"; g2.appendChild(createColorPicker('color_abfluss_line', 'Box: Verbrauch Linie', '#d35400')); g2.appendChild(createColorPicker('color_abfluss_bg', 'Box: Verbrauch HG', 'rgba(211, 84, 0, 0.08)')); designTarget.appendChild(g2);
      const gChart1 = document.createElement('div'); gChart1.className = "flex-row"; gChart1.appendChild(createColorPicker('color_netz', 'Chart: Netzbezug', '#8b0000')); gChart1.appendChild(createColorPicker('color_einsp', 'Chart: Einspeisung', '#27ae60')); designTarget.appendChild(gChart1);
      const gChart2 = document.createElement('div'); gChart2.className = "flex-row"; gChart2.appendChild(createColorPicker('color_bat_ent', 'Chart: Bat. Entladen', '#3498db')); gChart2.appendChild(createColorPicker('color_bat_lad', 'Chart: Bat. Laden', '#2980b9')); designTarget.appendChild(gChart2);
      const gChart3 = document.createElement('div'); gChart3.className = "flex-row"; gChart3.appendChild(createColorPicker('color_pv_direkt', 'Chart: PV Direkt', '#f1c40f')); gChart3.appendChild(createColorPicker('color_pv_line', 'Chart: PV Linie', '#e67e22')); designTarget.appendChild(gChart3);
      const gChart4 = document.createElement('div'); gChart4.className = "flex-row"; gChart4.appendChild(createColorPicker('color_haus_line', 'Chart: Haus Linie', '#000000')); designTarget.appendChild(gChart4);

      const darkColorsDet = this.createDetailsElement('design_colors_dark', this.t('colors_dark'), false);
      const darkTarget = darkColorsDet.querySelector('.content-target');
      designTarget.appendChild(darkColorsDet);

      const gd1 = document.createElement('div'); gd1.className = "flex-row"; gd1.appendChild(createColorPicker('color_zufluss_line_dark', 'Box: Zufluss Linie (Dark)', '#5dade2')); gd1.appendChild(createColorPicker('color_zufluss_bg_dark', 'Box: Zufluss HG (Dark)', 'rgba(93, 173, 226, 0.15)')); darkTarget.appendChild(gd1);
      const gd2 = document.createElement('div'); gd2.className = "flex-row"; gd2.appendChild(createColorPicker('color_abfluss_line_dark', 'Box: Verbrauch Linie (Dark)', '#e67e22')); gd2.appendChild(createColorPicker('color_abfluss_bg_dark', 'Box: Verbrauch HG (Dark)', 'rgba(230, 126, 34, 0.15)')); darkTarget.appendChild(gd2);
      const gdChart = document.createElement('div'); gdChart.className = "flex-row"; gdChart.appendChild(createColorPicker('color_pv_line_dark', 'Chart: PV Linie (Dark)', '#e67e22')); gdChart.appendChild(createColorPicker('color_haus_line_dark', 'Chart: Haus Linie (Dark)', '#ffffff')); darkTarget.appendChild(gdChart);
      const gdChart2 = document.createElement('div'); gdChart2.className = "flex-row"; gdChart2.appendChild(createColorPicker('color_bat_soc_dark', 'Chart: SoC (Dark)', '#bb8fce')); gdChart2.appendChild(createColorPicker('color_temp_dark', 'Chart: Temperatur (Dark)', '#e74c3c')); darkTarget.appendChild(gdChart2);

      const gNum = document.createElement('div'); gNum.className = "flex-row"; gNum.appendChild(this.createField('decimals_heute', this.t('lbl_dec_heute'), 'number')); gNum.appendChild(this.createField('decimals_live', this.t('lbl_dec_live'), 'number')); designTarget.appendChild(gNum);
      const gWidth = document.createElement('div'); gWidth.className = "flex-row"; gWidth.appendChild(this.createField('width_heute', this.t('lbl_width_heute'), 'number')); gWidth.appendChild(this.createField('width_live', this.t('lbl_width_live'), 'number')); designTarget.appendChild(gWidth);
      
      const addSwitch = (k, l) => { const sw = document.createElement('ha-switch'); sw.setAttribute('config-key', k); sw.checked = getConf(k, k.includes('haus')); sw.onchange = e => this.updateConfig(k, e.target.checked); const f = document.createElement('ha-formfield'); f.label = l; f.style.display="flex"; f.appendChild(sw); designTarget.appendChild(f); };
      addSwitch('pv_start_open', 'Photovoltaik beim Starten offen'); addSwitch('haus_start_open', 'Hausverbrauch beim Starten offen');

      const langWrap = this.querySelector('#lang_options'); const langDet = this.createDetailsElement('lang_overrides', 'Texte anpassen', false); langWrap.appendChild(langDet);
      Object.keys(TRANSLATIONS['de']).forEach(k => { langDet.querySelector('.content-target').appendChild(this.createField(`txt_${k}`, `Text für '${k}'`, 'text')); });
      
      const mainWrap = this.querySelector('#main_sensors');
      [{k:'pv',n:this.t('photovoltaik')},{k:'netz',n:this.t('netzbezug')},{k:'einspeisung',n:this.t('einspeisung')},{k:'bat_ent',n:this.t('bat_ent')},{k:'bat_lad',n:this.t('bat_lad')},{k:'haus',n:this.t('haus')}].forEach(d => { const det = this.createDetailsElement(`main_${d.k}`, d.n, false); mainWrap.appendChild(det); this.attachBlock(det.querySelector('.content-target'), d.k, d.k); });
      this.renderSubs('pv', 15); this.renderSubs('haus', 15);
    } catch (e) { console.error("UI Editor Fehler:", e); }
  }

  createField(key, label, type) {
    let val = this._config[key];
    if (val === undefined || val === null) val = "";
    if (type === 'text' || type === 'number') {
        const tf = document.createElement('ha-textfield'); tf.setAttribute('config-key', key); tf.label = label; tf.type = type; tf.value = val; tf.style.margin="0";
        tf.onchange = e => this.updateConfig(key, type === 'number' ? parseFloat(e.target.value) : e.target.value); return tf;
    } else {
        const sel = document.createElement('ha-selector'); sel.setAttribute('config-key', key); sel.hass = this._hass; 
        if (type === 'icon') sel.selector = { icon: {} };
        else if (type === 'sensor') sel.selector = { entity: { domain: 'sensor' } };
        else sel.selector = { entity: { device_class: type } }; 
        sel.value = val;
        sel.addEventListener('value-changed', e => this.updateConfig(key, e.detail.value)); return sel;
    }
  }

  createDetailsElement(id, title, canDelete, deleteCallback) {
    const det = document.createElement('details'); det.className = "sub-details"; det.id = id; if (this._openedDetails.has(id)) det.open = true;
    const summary = document.createElement('summary'); summary.className = "sub-summary"; summary.innerHTML = `<ha-icon icon="mdi:chevron-right" class="summary-icon"></ha-icon><span>${esc(title)}</span>`;
    if (canDelete) { const del = document.createElement('ha-icon'); del.icon = "mdi:trash-can-outline"; del.className = "delete-btn"; del.onclick = (e) => { e.preventDefault(); e.stopPropagation(); deleteCallback(); }; summary.appendChild(del); }
    det.appendChild(summary); const target = document.createElement('div'); target.className = "content-target"; det.appendChild(target); return det;
  }
  
  renderSubs(type, max) {
    const container = this.querySelector(`#${type}_subs_container`); let subKeys = Object.keys(this._config).filter(k => k.startsWith(`${type}_sub`) && k.endsWith('_heute'));
    let count = subKeys.length > 0 ? Math.max(...subKeys.map(k => parseInt(k.match(/\d+/)[0]))) : 0;
    for (let i = 1; i <= count; i++) { const det = this.createDetailsElement(`${type}_sub_${i}`, `${type==='pv'?'PV':'Haus'} Element ${i}`, true, () => this.deleteSub(type, i, count)); container.appendChild(det); this.attachBlock(det.querySelector('.content-target'), `${type}_sub${i}`, 'sub', type, i); }
    if (count < max) { const wrap = document.createElement('div'); wrap.className = "add-btn-wrap"; const btn = document.createElement('button'); btn.className = "add-btn"; btn.innerHTML = `<ha-icon icon="mdi:plus"></ha-icon> Hinzufügen`; btn.onclick = () => { const nIdx = count + 1; this._openedDetails.add(`${type}_sub_${nIdx}`); this.updateConfig(`${type}_sub${nIdx}_heute`, ""); this.buildDOM(); }; wrap.appendChild(btn); container.appendChild(wrap); }
  }
  
  deleteSub(type, index, total) {
    let nc = { ...this._config }; ['name', 'icon', 'heute', 'live', 'color'].forEach(f => delete nc[`${type}_sub${index}_${f}`]);
    for (let i = index + 1; i <= total; i++) { ['name', 'icon', 'heute', 'live', 'color'].forEach(f => { if (nc[`${type}_sub${i}_${f}`] !== undefined) nc[`${type}_sub${i-1}_${f}`] = nc[`${type}_sub${i}_${f}`]; delete nc[`${type}_sub${i}_${f}`]; }); }
    this._config = nc; this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true })); this.buildDOM();
  }
  
  attachBlock(container, key, blockType, parentType, idx) {
    const r1 = document.createElement('div'); r1.className = "flex-row";
    r1.appendChild(this.createField(key + '_name', this.t('lbl_name'), 'text'));
    r1.appendChild(this.createField(key + '_icon', this.t('lbl_icon'), 'icon'));
    container.appendChild(r1);

    const r2 = document.createElement('div'); r2.className = "flex-row";
    r2.appendChild(this.createField(key + '_heute', this.t('lbl_heute'), 'energy'));
    r2.appendChild(this.createField(key + '_live', this.t('lbl_live'), 'power'));
    container.appendChild(r2);

    const createColorPicker = (key, label, defaultColor) => {
        let val = this._config[key]; if (val === undefined || val === null) val = defaultColor; val = String(val);
        const safeColor = val.startsWith('#') ? val : '#ffffff';
        const div = document.createElement('div'); div.className = "color-row";
        div.innerHTML = `<input type="color" value="${esc(safeColor)}"><ha-textfield config-key="${key}" label="${esc(label)}" value="${esc(val)}" style="flex:1; margin:0;"></ha-textfield>`;
        const picker = div.querySelector('input'); const field = div.querySelector('ha-textfield');
        picker.oninput = e => { field.value = e.target.value; this.updateConfig(key, e.target.value); }; 
        field.onchange = e => { picker.value = e.target.value; this.updateConfig(key, e.target.value); }; 
        return div;
    };

    if (blockType === 'sub') {
        const defaultSubColors = ['#6495ED', '#A855F7', '#EC4899', '#14B8A6', '#64748B', '#D946EF', '#84CC16', '#0EA5E9'];
        const defaultPvColors = ['#FFEC6E', '#FFC107', '#FFA000', '#E67800', '#C85000', '#AA2800', '#7A1500', '#4A0800'];
        let defCol = '#95a5a6';
        if (parentType === 'pv') defCol = defaultPvColors[(idx-1) % defaultPvColors.length];
        if (parentType === 'haus') defCol = defaultSubColors[(idx-1) % defaultSubColors.length];
        const r3 = document.createElement('div'); r3.className = "flex-row";
        r3.appendChild(createColorPicker(`${key}_color`, 'Farbe (Chart & Pie)', defCol));
        container.appendChild(r3);
    } else if (blockType === 'bat_lad') {
        const lbl = document.createElement('div'); lbl.className = "field-label"; lbl.innerText = "Batterie Ladezustand (SoC %)"; container.appendChild(lbl);
        container.appendChild(this.createField('bat_soc', '', 'sensor'));
        container.appendChild(this.createField('bat_soc_icon', this.t('lbl_icon'), 'icon')); 
        container.appendChild(createColorPicker('color_bat_soc', 'Farbe SoC (Chart)', '#9b59b6'));
    } else if (blockType === 'haus') {
        const lbl = document.createElement('div'); lbl.className = "field-label"; lbl.innerText = "Temp. Sensor (°C)"; container.appendChild(lbl);
        const rT = document.createElement('div'); rT.className = "flex-row";
        rT.appendChild(this.createField('temp_name', 'Anzeige-Name', 'text'));
        rT.appendChild(this.createField('temp_ohmpilot', 'Sensor Entität', 'sensor'));
        container.appendChild(rT);
        container.appendChild(createColorPicker('color_rest_haus', 'Farbe Restl. Haus (Pie)', '#7f8c8d'));
    } else if (blockType === 'pv') {
        const r3 = document.createElement('div'); r3.className = "flex-row";
        r3.appendChild(createColorPicker('color_pv_line', 'Farbe PV-Gesamt (Linie)', '#e67e22'));
        r3.appendChild(createColorPicker('color_pv_direkt', 'Farbe PV-Direkt (Fläche)', '#f1c40f'));
        container.appendChild(r3);
    } else if (['netz', 'einspeisung', 'bat_ent'].includes(blockType)) {
        const defaultColors = { netz: '#8b0000', einspeisung: '#27ae60', bat_ent: '#3498db' };
        const r3 = document.createElement('div'); r3.className = "flex-row";
        r3.appendChild(createColorPicker(`color_${blockType}`, 'Farbe Chart (Fläche)', defaultColors[blockType]));
        container.appendChild(r3);
    }
  }
  updateConfig(k, v) { this._config = { ...this._config, [k]: v }; this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true })); }
}

// =========================================================
// AREA 3: THE UNIFIED CARD (ENTERPRISE EDITION)
// =========================================================
class EnergiebilanzCard extends HTMLElement {
  constructor() { 
    super(); 
    this.attachShadow({ mode: 'open' }); // 🛡️ SHADOW DOM ACTIVATED
    this.currentDate = new Date(); 
    this.currentDate.setHours(12, 0, 0, 0); 
    this.chartLevel = 'day'; 
    this.config = {}; 
    this.hiddenSeries = new Set();
    this._autoRefreshInterval = null; 
    this._liveNodes = [];
    this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    this._renderGen = 0; 
  }

  connectedCallback() {
      this._autoRefreshInterval = setInterval(() => { this.renderDashboard(); }, 300000); 
  }
  
  disconnectedCallback() {
      if (this._autoRefreshInterval) clearInterval(this._autoRefreshInterval);
  }

  static getConfigElement() { return document.createElement("energiebilanz-card-editor"); }
  
  t(k) { 
      const lang = this._hass && this._hass.language ? this._hass.language.split('-')[0] : 'de'; 
      const map = TRANSLATIONS[lang] || TRANSLATIONS['en']; 
      return this.config[`txt_${k}`] || map[k] || k; 
  }
  
  setConfig(config) { 
      this.config = { ...config }; 
      this.content = false; 
  }
  
  isConfTrue(k, def) {
      let v = this.config[k];
      if (v === undefined) return def;
      return v === true || String(v).toLowerCase() === 'true';
  }

  getColorForPercentage(value, minRed = 0) {
      let p = (value - minRed) / (100 - minRed);
      p = Math.max(0, Math.min(1, p));
      const hue = p * 120; 
      return `hsl(${hue}, 85%, 42%)`;
  }

  set hass(hass) { 
    const oldHass = this._hass;
    this._hass = hass; 
    
    if (!this.content) { 
        this.buildHTML(); 
        this.content = true; 
        this.attachListeners(); 
        this.renderDashboard(); 
    } 
    
    const isToday = (this.chartLevel === 'day' && this.currentDate.toDateString() === new Date().toDateString());
    if (isToday) {
        let stateChanged = false;
        if (!this._liveNodes || this._liveNodes.length === 0) {
            this._liveNodes = Array.from(this.shadowRoot.querySelectorAll('.s-val[data-entity], .live-update-target'));
            stateChanged = true; 
        } else if (oldHass) {
            for (const node of this._liveNodes) {
                const entityId = node.dataset.entity;
                if (entityId && oldHass.states[entityId] !== hass.states[entityId]) {
                    stateChanged = true; break;
                }
            }
        } else { stateChanged = true; }
        if (stateChanged) this.updateLiveUI();
    }
  }

  buildHTML() {
    const getConf = (k, d) => (this.config && this.config[k] !== undefined && this.config[k] !== '') ? this.config[k] : d;
    const wHeute = getConf('width_heute', 102); 
    const wLive = getConf('width_live', 102);
    
    const isDark = this._hass && this._hass.themes && this._hass.themes.darkMode;
    const cMain = isDark ? 'var(--primary-text-color)' : getConf('color_main_text', 'var(--primary-text-color)'); 
    const cSub = getConf('color_sub_text', '#777777');

    let pvSubs = []; 
    const defaultPvColors = ['#FFEC6E', '#FFC107', '#FFA000', '#E67800', '#C85000', '#AA2800', '#7A1500', '#4A0800'];
    for(let i=1; i<=15; i++) { 
        const h = this.config[`pv_sub${i}_heute`]; const l = this.config[`pv_sub${i}_live`]; 
        if(h || l) pvSubs.push({ key: `pv_sub${i}`, name: getConf(`pv_sub${i}_name`, `PV ${i}`), icon: getConf(`pv_sub${i}_icon`, 'mdi:solar-power'), heute: h || '', live: l || '', color: getConf(`pv_sub${i}_color`, defaultPvColors[(i-1)%defaultPvColors.length]) }); 
    }
    
    let hausSubs = []; 
    const defaultSubColors = ['#6495ED', '#A855F7', '#EC4899', '#14B8A6', '#64748B', '#D946EF', '#84CC16', '#0EA5E9'];
    for(let i=1; i<=15; i++) { 
        const h = this.config[`haus_sub${i}_heute`]; const l = this.config[`haus_sub${i}_live`]; 
        if(h || l) hausSubs.push({ key: `sub${i}`, name: getConf(`haus_sub${i}_name`, `Verbraucher ${i}`), icon: getConf(`haus_sub${i}_icon`, 'mdi:power-plug'), heute: h || '', live: l || '', color: getConf(`haus_sub${i}_color`, defaultSubColors[(i-1)%defaultSubColors.length]) }); 
    }
    
    this.pvSubsConfig = pvSubs; this.hausSubsConfig = hausSubs; this._liveNodes = [];

    this.shadowRoot.innerHTML = `
      <ha-card style="width: 100%; margin: 0 auto; padding: 16px; --w-heute: ${wHeute}px; --w-live: ${wLive}px; --col-main: ${cMain}; --col-sub: ${cSub}; position: relative; overflow: hidden; background: var(--card-background-color);">
        
        <div style="display: flex; flex-direction: column; gap: 14px; border-bottom: 1px solid var(--divider-color); padding-bottom: 14px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="width: 32px;"></div>
                <div class="eb-datepicker-wrapper" style="display: flex; align-items: center; gap: 12px; font-size: 1.2em; font-weight: bold;">
                    <ha-icon icon="mdi:chevron-left" id="date-prev" style="cursor: pointer; padding: 4px; color: var(--primary-text-color);"></ha-icon>
                    <div style="position: relative; cursor: pointer; min-width: 130px; text-align: center;">
                        <input type="date" id="date-input" style="position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer; left:0; top:0;" />
                        <span id="date-text" style="color: var(--primary-text-color); white-space: nowrap;">---</span>
                    </div>
                    <ha-icon icon="mdi:chevron-right" id="date-next" style="cursor: pointer; padding: 4px; color: var(--primary-text-color);"></ha-icon>
                </div>
                <ha-icon icon="mdi:refresh" id="manual-refresh" class="refresh-btn" title="Manuell aktualisieren" style="width: 32px;"></ha-icon>
            </div>
            
            <div class="eb-level-toggles" style="display: flex; justify-content: space-between; width: 100%; background: var(--secondary-background-color, rgba(0,0,0,0.05)); padding: 4px; border-radius: 8px;">
                <span class="eb-lvl-btn" data-lvl="total" style="flex: 1; text-align: center;">${esc(this.t('gesamt'))}</span>
                <span class="eb-lvl-btn" data-lvl="year" style="flex: 1; text-align: center;">${esc(this.t('jahr'))}</span>
                <span class="eb-lvl-btn" data-lvl="month" style="flex: 1; text-align: center;">${esc(this.t('monat'))}</span>
                <span class="eb-lvl-btn active" data-lvl="day" style="flex: 1; text-align: center;">${esc(this.t('tag'))}</span>
            </div>
        </div>
        
        <div id="eb-summary-area" style="touch-action: pan-y;"></div>
        <div id="svg-container-alternativ" style="width: 100%; margin-top: 16px; position: relative; cursor: crosshair; touch-action: pan-y;"></div>
        <div id="alt-legend" class="chart-legend" style="display:flex; flex-direction:column; gap:8px; align-items:center; margin-top: 16px; font-size: 14px; user-select: none;"></div>
        
        <div id="eb-bottom-sheet" class="bottom-sheet-container">
            <div class="sheet-backdrop"></div>
            <div class="sheet-content">
                <div class="sheet-header">
                    <div class="sheet-handle"></div>
                    <span id="sheet-title" style="font-weight:bold; font-size:1.1em; color: var(--primary-text-color);">${esc(this.t('details'))}</span>
                    <ha-icon icon="mdi:close" class="sheet-close"></ha-icon>
                </div>
                <div id="sheet-body" class="sheet-body"></div>
            </div>
        </div>

      </ha-card>
      
      <div id="eb-tooltip" style="display:none; position:fixed; z-index:9999; background:rgba(0,0,0,0.85); color:#fff; padding:12px; border-radius:8px; font-size:13px; pointer-events:none; box-shadow:0 4px 12px rgba(0,0,0,0.4); line-height:1.5;"></div>

      <style>
        .bottom-sheet-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 100; pointer-events: none; opacity: 0; transition: opacity 0.3s; display: flex; align-items: flex-end; }
        .bottom-sheet-container.open { pointer-events: auto; opacity: 1; }
        .sheet-backdrop { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); }
        .sheet-content { width: 100%; background: var(--card-background-color); border-radius: 16px 16px 0 0; box-shadow: 0 -2px 10px rgba(0,0,0,0.2); transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.5, 1); z-index: 101; max-height: 85%; display: flex; flex-direction: column; overflow: hidden; }
        .bottom-sheet-container.open .sheet-content { transform: translateY(0); }
        .sheet-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--divider-color); position: relative; cursor: grab; }
        .sheet-header:active { cursor: grabbing; }
        .sheet-handle { position: absolute; top: 6px; left: 50%; transform: translateX(-50%); width: 40px; height: 4px; background: var(--divider-color); border-radius: 2px; }
        .sheet-close { cursor: pointer; color: var(--secondary-text-color); }
        
        .sheet-body { overflow-y: auto; max-height: 75vh; color: var(--primary-text-color); padding: 16px; }

        .eb-level-toggles { font-size: 14px; font-weight: bold; color: var(--secondary-text-color); }
        .eb-lvl-btn { cursor: pointer; padding: 6px 8px; border-radius: 6px; transition: 0.2s; }
        .eb-lvl-btn:hover { background: rgba(0,0,0,0.05); }
        .eb-lvl-btn.active { color: white; background: var(--primary-color); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        
        .refresh-btn { cursor: pointer; color: var(--secondary-text-color); transition: transform 0.3s; }
        .refresh-btn:hover { color: var(--primary-color); }
        .refresh-btn.spinning { animation: spin-anim 1s linear infinite; }
        @keyframes spin-anim { 100% { transform: rotate(360deg); } }
        
        .summary-flex { display: flex; flex-wrap: wrap; gap: 12px; }
        .summary-box { flex: 1 1 300px; padding: 8px 12px; border-radius: 6px; }
        
        .s-row { display: grid; grid-template-columns: 24px 1fr var(--w-heute) var(--w-live); gap: 2px 8px; align-items: center; padding: 1px 0; position: relative; }
        .s-row.past { grid-template-columns: 24px 1fr var(--w-heute); }
        .s-row-header { display: grid; grid-template-columns: 24px 1fr var(--w-heute) var(--w-live); gap: 2px 8px; align-items: end; padding-bottom: 4px; margin-bottom: 4px; border-bottom: 1px solid var(--divider-color); }
        .s-row-header.past { grid-template-columns: 24px 1fr var(--w-heute); }
        
        .s-row.tree-child { grid-template-columns: 44px 1fr var(--w-heute) var(--w-live); }
        .s-row.tree-child.past { grid-template-columns: 44px 1fr var(--w-heute); }
        .s-row.tree-child > ha-icon { margin-left: 20px; }
        
        .col-head { font-size: 10px; color: var(--secondary-text-color); text-align: right; text-transform: uppercase; font-weight: bold; }
        .s-row ha-icon { --mdc-icon-size: 20px; color: var(--state-icon-active-color, #3182b7); }
        .s-name { font-size: 14px; color: var(--primary-text-color); font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .s-val { font-size: 14px; text-align: right; white-space: nowrap; font-weight: bold; color: var(--col-main); cursor: pointer; border-radius: 4px; padding: 2px 4px; transition: 0.2s;}
        .s-val:hover { background: var(--primary-color); color: white !important; }
        
        .sub-item-name { color: var(--col-sub) !important; font-weight: normal !important; }
        .tree-child .s-val { color: var(--col-sub) !important; font-weight: normal !important; }
        
        .eb-accordion { outline: none; }
        .eb-summary-grid { list-style: none; cursor: pointer; display: block; outline: none; }
        .eb-summary-grid::-webkit-details-marker { display: none; }
        .accordion-chevron { transition: transform 0.3s; color: var(--secondary-text-color); }
        details[open] .accordion-chevron { transform: rotate(90deg); }
        .eb-details-content { margin-top: 2px; display: flex; flex-direction: column; gap: 0px; }
        
        .tree-line-vertical { position: absolute; left: 11px; top: -10px; bottom: -10px; border-left: 2px solid var(--secondary-text-color); opacity: 0.5; }
        .tree-line-vertical-last { position: absolute; left: 11px; top: -10px; height: calc(50% + 10px); border-left: 2px solid var(--secondary-text-color); opacity: 0.5; }
        .tree-line-horizontal { position: absolute; left: 11px; top: 50%; width: 15px; border-top: 2px solid var(--secondary-text-color); opacity: 0.5; }
        
        .chart-bar { transition: opacity 0.2s; } .chart-bar:hover { opacity: 0.8; cursor: pointer; }
        .hover-zone { cursor: pointer; outline: none; } .hover-zone:hover { fill: rgba(0,0,0,0.05); }
        .leg-item { cursor: pointer; transition: 0.2s; display: inline-block; }
        .leg-item:hover { transform: scale(1.05); }
        .leg-hidden { opacity: 0.4; text-decoration: line-through; }
      </style>
    `;
  }

  attachListeners() {
    this.shadowRoot.querySelectorAll('.eb-lvl-btn').forEach(btn => {
        btn.onclick = (e) => { this.chartLevel = e.target.dataset.lvl; this.renderDashboard(); };
    });

    const input = this.shadowRoot.querySelector('#date-input');
    input.onclick = () => input.showPicker();
    input.onchange = (e) => { 
        const p = e.target.value.split('-'); this.currentDate = new Date(p[0], p[1]-1, p[2], 12, 0, 0); this.renderDashboard(); 
    };
    
    this.shadowRoot.querySelector('#date-prev').onclick = () => this.changePeriod(-1);
    this.shadowRoot.querySelector('#date-next').onclick = () => this.changePeriod(1);
    
    this.shadowRoot.querySelector('#manual-refresh').onclick = (e) => {
        const icon = e.target; icon.classList.add('spinning');
        this.renderDashboard().then(() => { setTimeout(() => icon.classList.remove('spinning'), 500); });
    };
    
    const sheet = this.shadowRoot.querySelector('#eb-bottom-sheet');
    const backdrop = this.shadowRoot.querySelector('.sheet-backdrop');
    const closeBtn = this.shadowRoot.querySelector('.sheet-close');
    const sheetHeader = this.shadowRoot.querySelector('.sheet-header');
    
    const closeSheet = () => { sheet.classList.remove('open'); };
    backdrop.onclick = closeSheet; closeBtn.onclick = closeSheet;

    let startY = 0;
    sheetHeader.ontouchstart = e => { startY = e.touches[0].clientY; };
    sheetHeader.ontouchmove = e => { const currentY = e.touches[0].clientY; if (currentY - startY > 50) closeSheet(); };

    const attachSwipe = (el) => {
        if (!el) return;
        let swipeStartX = 0, swipeStartY = 0;
        el.ontouchstart = (e) => { swipeStartX = e.touches[0].clientX; swipeStartY = e.touches[0].clientY; };
        el.ontouchend = (e) => {
            const diffX = swipeStartX - e.changedTouches[0].clientX; const diffY = swipeStartY - e.changedTouches[0].clientY;
            if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX > 0) this.changePeriod(1); else this.changePeriod(-1);          
            }
        };
    };
    
    const svgCont = this.shadowRoot.querySelector('#svg-container-alternativ');
    attachSwipe(svgCont);
    attachSwipe(this.shadowRoot.querySelector('#eb-summary-area')); 
    
    const getTargetData = (clientX) => {
       const rect = svgCont.getBoundingClientRect();
       const scaleX = 1200 / rect.width; 
       const svgX = (clientX - rect.left) * scaleX;
       const hoverZones = this.shadowRoot.querySelectorAll('.hover-zone');
       for (const zone of hoverZones) {
           const zoneX = parseFloat(zone.getAttribute('x'));
           const zoneW = parseFloat(zone.getAttribute('width'));
           if (svgX >= zoneX && svgX <= (zoneX + zoneW)) return JSON.parse(decodeURIComponent(zone.dataset.info));
       }
       return null;
    };

    if (this.isTouchDevice) {
        svgCont.onclick = e => { 
            let cx = e.touches ? e.touches[0].clientX : (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
            const d = getTargetData(cx); if (d && !d.isFuture) this._generateDetailsView(d, false); 
        };
    } else {
        svgCont.onmousemove = e => {
            const d = getTargetData(e.clientX);
            const tooltip = this.shadowRoot.querySelector('#eb-tooltip');
            if (d && !d.isFuture) {
                this._generateDetailsView(d, true);
                let tW = tooltip.offsetWidth; let tH = tooltip.offsetHeight;
                let nX = e.clientX + 15; let nY = e.clientY + 15;
                if (nX + tW > window.innerWidth) nX = window.innerWidth - tW - 10;
                if (nY + tH > window.innerHeight) nY = window.innerHeight - tH - 10;
                if (nX < 0) nX = 10; 
                if (nY < 0) nY = 10; 
                tooltip.style.left = nX + 'px'; tooltip.style.top = nY + 'px';
                tooltip.style.display = 'block'; 
            } else { tooltip.style.display = 'none'; }
        };
        
        svgCont.onmouseleave = () => this.shadowRoot.querySelector('#eb-tooltip').style.display = 'none';
        
        svgCont.onclick = e => {
            const d = getTargetData(e.clientX);
            if (d && !d.isFuture && this.chartLevel !== 'day') this.executeDrilldown(d);
        };
    }
  }

  executeDrilldown(d) {
      const newDate = new Date(this.currentDate);
      if (this.chartLevel === 'total') {
          this.chartLevel = 'year'; newDate.setDate(1); newDate.setMonth(0); newDate.setFullYear(d.matchStart); 
      } else if (this.chartLevel === 'year') { 
          this.chartLevel = 'month'; newDate.setDate(1); newDate.setMonth(d.idx); 
      } else if (this.chartLevel === 'month') { 
          this.chartLevel = 'day'; newDate.setTime(new Date(d.tDate).getTime());
      } 
      this.currentDate = newDate; this.renderDashboard(); 
  }

  _generateDetailsView(d, isTooltip) {
      const isDark = this._hass && this._hass.themes && this._hass.themes.darkMode;
      const getConf = (k, def) => (this.config && this.config[k]) ? this.config[k] : def;
      const forceDark = isTooltip; 
      const getColor = (key, def) => { if((isDark||forceDark) && this.config[key + '_dark']) return this.config[key+'_dark']; return (this.config && this.config[key]) ? this.config[key] : def; };
      
      const colRestHaus = getColor('color_rest_haus', '#7f8c8d');
      const tempName = (this.config && this.config.temp_name) ? this.config.temp_name : this.t('temperatur');
      const socIcon = getConf('bat_soc_icon', 'mdi:battery-high');
      
      const autarkyColor = this.getColorForPercentage(d.autarkie, 0);
      const socColor = this.getColorForPercentage(d.soc, 10);
      
      const textColor = forceDark ? '#ffffff' : 'var(--primary-text-color)';
      const subTextColor = forceDark ? '#cccccc' : 'var(--secondary-text-color)';
      const divColor = forceDark ? '#555555' : 'var(--divider-color)';

      let html = "";
      
      if (isTooltip) {
          html += `<div style="border-bottom:1px solid ${divColor}; padding-bottom:4px; margin-bottom:10px; text-align:center; font-size:14px; color:${textColor};"><b>${esc(d.smartLabel)}</b></div>`;
      } else {
          this.shadowRoot.querySelector('#sheet-title').innerText = d.smartLabel; 
          html += `<div style="display: flex; justify-content: space-around; padding: 12px 0; border-bottom: 1px solid var(--divider-color); background: var(--secondary-background-color, rgba(0,0,0,0.05)); border-radius: 8px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 4px; font-weight: bold; color: ${socColor};"><ha-icon icon="${esc(socIcon)}" style="color: ${socColor}; --mdc-icon-size: 20px;"></ha-icon> ${d.soc.toFixed(1)}%</div>
            <div style="display: flex; align-items: center; gap: 4px; font-weight: bold; color: var(--primary-text-color);"><ha-icon icon="mdi:thermometer" style="color: ${getColor('color_temp', '#e74c3c')}; --mdc-icon-size: 20px;"></ha-icon> ${d.temp.toFixed(1)}°C</div>
            <div style="display: flex; align-items: center; gap: 4px; font-weight: bold; color: ${autarkyColor};"><ha-icon icon="mdi:leaf" style="color: ${autarkyColor}; --mdc-icon-size: 20px;"></ha-icon> ${d.autarkie.toFixed(1)}%</div>
          </div>`;
      }

      const renderItem = (icon, color, name, val) => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 3px 0; font-size: 13px;">
              <div style="display: flex; align-items: center; gap: 6px; overflow: hidden; color: ${subTextColor};">
                  <ha-icon icon="${esc(icon)}" style="color: ${color}; --mdc-icon-size: 16px; flex-shrink: 0;"></ha-icon>
                  <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(name)}</span>
              </div>
              <span style="white-space: nowrap; font-weight: bold; margin-left: 8px; color: ${textColor};">${val.toFixed(1)} kWh</span>
          </div>`;

      const renderSection = (title, total, subs, rName, rVal, includePie) => {
          let out = `<div>`;
          if (includePie) {
              let cg = ""; let curPct = 0; let validTotal = total > 0 ? total : 1;
              let sorted = subs ? [...subs].sort((a, b) => b.val - a.val) : [];
              if (sorted.length > 0) { sorted.forEach(sub => { if(sub.val > 0) { let pct = (sub.val / validTotal) * 100; cg += `${sub.color} ${curPct}%, ${sub.color} ${curPct + pct}%, `; curPct += pct; } }); }
              if(rVal > 0) { cg += `${colRestHaus} ${curPct}%, ${colRestHaus} 100%`; } else { cg = cg.replace(/, $/, ""); }
              if(total === 0) cg = "#333 0%, #333 100%";
              out += `<div style="width: 80px; height: 80px; margin: 0 auto 10px auto; border-radius: 50%; background: conic-gradient(${cg}); border: 2px solid ${divColor}; box-shadow: inset 0 0 4px rgba(0,0,0,0.5);"></div>`;
          }
          out += `<h4 style="margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; text-align: ${includePie?'center':'left'}; color: ${subTextColor}; border-bottom: 1px solid ${divColor}; padding-bottom: 4px;">${esc(title)}</h4>`;
          let srt = subs ? [...subs].sort((a, b) => b.val - a.val) : [];
          srt.forEach(sub => { if(sub.val > 0) out += renderItem(sub.icon, sub.color, sub.name, sub.val); });
          if(rVal > 0) out += renderItem('mdi:home', colRestHaus, rName, rVal);
          out += `<div style="border-top: 1px solid ${divColor}; margin-top: 4px; padding-top: 4px;">${renderItem('mdi:sigma', textColor, this.t('gesamt'), total)}</div></div>`;
          return out;
      };

      let wrapperStyle = isTooltip ? `display:flex; gap:30px; align-items:flex-start;` : `display:grid; grid-template-columns: 1fr 1fr; gap:16px;`;
      html += `<div style="${wrapperStyle}">`;
      html += renderSection(this.t('haus'), d.haus, d.subs, this.t('rest_haus'), d.restHaus, isTooltip);
      html += renderSection(this.t('photovoltaik'), d.pv, d.pvSubs, '', 0, isTooltip);
      html += `</div>`; 

      let botStyle = isTooltip ? `display:flex; justify-content:space-between;` : `display:grid; grid-template-columns: 1fr 1fr; gap:16px;`;
      html += `<div style="${botStyle} border-top: 1px solid ${divColor}; padding-top: 12px; margin-top: 12px;">`;
      
      let batCol = `<div style="width: ${isTooltip?'48%':'auto'};">`;
      if(!isTooltip) batCol += `<h4 style="margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; color: ${subTextColor}; border-bottom: 1px solid ${divColor}; padding-bottom: 4px;">Batterie</h4>`;
      batCol += renderItem('mdi:battery-plus', getColor('color_bat_lad', '#2980b9'), this.t('bat_lad'), d.bLad);
      batCol += renderItem('mdi:battery-minus', getColor('color_bat_ent', '#3498db'), this.t('bat_ent'), d.bEnt);
      batCol += `</div>`; html += batCol;
      
      let netCol = `<div style="width: ${isTooltip?'48%':'auto'};">`;
      if(!isTooltip) netCol += `<h4 style="margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; color: ${subTextColor}; border-bottom: 1px solid ${divColor}; padding-bottom: 4px;">Netz</h4>`;
      netCol += renderItem('mdi:transmission-tower-import', getColor('color_netz', '#8b0000'), this.t('netzbezug'), d.netz);
      netCol += renderItem('mdi:transmission-tower-export', getColor('color_einsp', '#27ae60'), this.t('einspeisung'), d.ein);
      netCol += `</div>`; html += netCol;
      html += `</div>`; 

      if (isTooltip && (this.config.bat_soc || this.config.temp_ohmpilot)) {
          html += `<div style="margin-top:6px; border-top:1px solid ${divColor}; padding-top:6px; display:flex; justify-content:space-around; font-size:12px;">`;
          if (this.config.bat_soc) html += `<span style="display:flex; align-items:center; gap:4px; color:${subTextColor};"><ha-icon icon="${esc(socIcon)}" style="color:${socColor}; --mdc-icon-size:16px;"></ha-icon> SoC: <b style="color:${textColor};">${d.soc.toFixed(1)} %</b></span>`;
          if (this.config.temp_ohmpilot) html += `<span style="display:flex; align-items:center; gap:4px; color:${subTextColor};"><ha-icon icon="mdi:thermometer" style="color:${getColor('color_temp', '#e74c3c')}; --mdc-icon-size:16px;"></ha-icon> ${esc(tempName)}: <b style="color:${textColor};">${d.temp.toFixed(1)} °C</b></span>`;
          html += `</div>`;
      }

      if (isTooltip) {
          this.shadowRoot.querySelector('#eb-tooltip').innerHTML = html;
      } else {
          if (this.chartLevel !== 'day') {
              html += `<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--divider-color);">
                  <button id="sheet-drilldown-btn" style="width: 100%; padding: 14px; background: var(--primary-color); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                      <ha-icon icon="mdi:magnify" style="--mdc-icon-size: 18px;"></ha-icon> 🔍 Drill-Down: Details für ${esc(d.label)}
                  </button></div>`;
          }
          const sheet = this.shadowRoot.querySelector('#eb-bottom-sheet');
          this.shadowRoot.querySelector('#sheet-body').innerHTML = html;
          sheet.classList.add('open');
          
          if (this.chartLevel !== 'day') {
              this.shadowRoot.querySelector('#sheet-drilldown-btn').onclick = () => {
                  sheet.classList.remove('open'); this.executeDrilldown(d);
              };
          }
      }
  }

  changePeriod(dir) {
    let d = new Date(this.currentDate);
    if (this.chartLevel === 'total') d.setFullYear(d.getFullYear() + (dir * 5));
    else if (this.chartLevel === 'year') d.setFullYear(d.getFullYear() + dir);
    else if (this.chartLevel === 'month') d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir);
    if (d > new Date() && this.chartLevel === 'day') return;
    this.currentDate = d;
    this.renderDashboard();
  }

  generateSummaryHTML(isLive, dataTotals, isHausOpen, isPvOpen) {
    const isDark = this._hass && this._hass.themes && this._hass.themes.darkMode;
    const getConf = (k, d) => (this.config && this.config[k] !== undefined) ? this.config[k] : d;
    const getColor = (key, def) => { if(isDark && this.config[key + '_dark']) return this.config[key+'_dark']; return (this.config && this.config[key]) ? this.config[key] : def; };
    
    const zBg = isDark ? 'rgba(49, 130, 183, 0.15)' : getConf('color_zufluss_bg', 'rgba(49, 130, 183, 0.08)');
    const zLine = isDark ? '#5dade2' : getConf('color_zufluss_line', '#3182b7');
    const aBg = isDark ? 'rgba(211, 84, 0, 0.15)' : getConf('color_abfluss_bg', 'rgba(211, 84, 0, 0.08)');
    const aLine = isDark ? '#e67e22' : getConf('color_abfluss_line', '#d35400');
    
    const tempName = (this.config && this.config.temp_name) ? this.config.temp_name : this.t('temperatur');
    const socIcon = getConf('bat_soc_icon', 'mdi:battery-high');
    
    const sumZufluss = dataTotals.totalPV + dataTotals.totalNetz + dataTotals.totalBatEnt;
    const sumAbfluss = dataTotals.totalHaus + dataTotals.totalBatLad + dataTotals.totalEinsp;
    
    const getValHist = (entityId, pastTotal) => {
        let dec = parseInt(this.config.decimals_heute); if(isNaN(dec)) dec = 2;
        if (isLive) return `<div class="s-val" data-entity="${esc(entityId || '')}" data-islive="false">... kWh</div>`;
        return `<div class="s-val">${(pastTotal || 0).toLocaleString('de-DE', {minimumFractionDigits: dec, maximumFractionDigits: dec})} kWh</div>`;
    };

    const getValLive = (ent) => {
        let uom = 'W'; if (ent === this.config.bat_soc) uom = '%'; if (ent === this.config.temp_ohmpilot) uom = '°C';
        return `<div class="s-val live-update-target" data-entity="${esc(ent || '')}" data-islive="true">... ${uom}</div>`;
    };

    const renderRow = (icon, name, histHtml, liveHtml, isChild=false, isLast=false, iconColor='') => {
        let prefix = isChild ? `<div class="${isLast ? 'tree-line-vertical-last' : 'tree-line-vertical'}"></div><div class="tree-line-horizontal"></div>` : '';
        let styleStr = iconColor ? `style="color: ${iconColor};"` : '';
        return `
        <div class="s-row ${!isLive ? 'past' : ''} ${isChild ? 'tree-child' : ''}">
            ${prefix}
            <ha-icon icon="${esc(icon)}" ${styleStr}></ha-icon>
            <div class="s-name ${isChild ? 'sub-item-name' : ''}">${esc(name)}</div>
            ${histHtml}
            ${isLive ? liveHtml : ''}
        </div>`;
    };

    const renderAccordion = (isOpen, id, name, icon, histHtml, liveHtml, subs, isPv) => {
        if (!subs || subs.length === 0) return renderRow(icon, name, histHtml, liveHtml);
        return `
        <details id="${id}" class="eb-accordion" ${isOpen ? 'open' : ''}>
            <summary class="eb-summary-grid">
                <div class="s-row ${!isLive ? 'past' : ''}">
                    <ha-icon icon="${esc(icon)}"></ha-icon>
                    <div class="s-name" style="display:flex; align-items:center; justify-content:flex-start; gap: 6px;">
                        <ha-icon icon="mdi:chevron-right" class="accordion-chevron" style="--mdc-icon-size: 18px; flex-shrink: 0; margin-left: -4px;"></ha-icon>
                        <span style="overflow: hidden; text-overflow: ellipsis;">${esc(name)}</span>
                    </div>
                    ${histHtml}
                    ${isLive ? liveHtml : ''}
                </div>
            </summary>
            <div class="eb-details-content">
                ${subs.map((sub, idx) => {
                    const pastTotal = isPv ? dataTotals.pvSubTotals[sub.key] : dataTotals.subTotals[sub.key];
                    const hVal = getValHist(sub.heute, pastTotal);
                    const lVal = getValLive(sub.live);
                    return renderRow(sub.icon, sub.name, hVal, lVal, true, idx === subs.length - 1);
                }).join('')}
            </div>
        </details>`;
    };

    let html = `<div class="summary-flex">`;
    
    html += `<div class="summary-box" style="background: ${zBg}; border: 1px solid var(--divider-color, #e0e0e0); border-left: 4px solid ${zLine};">`;
    html += `<div class="s-row-header ${!isLive ? 'past' : ''}">
                <div style="grid-column: 1 / span 2; font-size: 1.1em; font-weight: bold; color: var(--primary-text-color); white-space: nowrap; display: flex; align-items: baseline;">
                    ${esc(this.t('zufluss'))} <span style="font-size: 10px; font-weight: normal; margin-left: 6px; color: var(--secondary-text-color);">&sum; ${sumZufluss.toFixed(1)} kWh</span>
                </div>
                <div class="col-head">${esc(isLive ? this.t('heute') : this.t('gesamt'))}</div>
                ${isLive ? `<div class="col-head">${esc(this.t('live'))}</div>` : ''}
             </div>`;
    html += renderAccordion(isPvOpen, 'acc-pv', this.t('pv_gesamt'), getConf('pv_icon', 'mdi:solar-panel-large'), getValHist(this.config.pv_heute, dataTotals.totalPV), getValLive(this.config.pv_live), this.pvSubsConfig, true);
    html += renderRow(getConf('netz_icon', 'mdi:transmission-tower-import'), this.t('netzbezug'), getValHist(this.config.netz_heute, dataTotals.totalNetz), getValLive(this.config.netz_live));
    html += renderRow(getConf('bat_ent_icon', 'mdi:battery-minus'), this.t('bat_ent'), getValHist(this.config.bat_ent_heute, dataTotals.totalBatEnt), getValLive(this.config.bat_ent_live));
    
    if (isLive && this.config.bat_soc) html += renderRow(socIcon, 'Batterie SoC', '<div></div>', `<div class="s-val live-update-target" data-entity="${esc(this.config.bat_soc)}" data-islive="true" data-is-soc="true">... %</div>`);
    html += `</div>`;

    html += `<div class="summary-box" style="background: ${aBg}; border: 1px solid var(--divider-color, #e0e0e0); border-left: 4px solid ${aLine};">`;
    html += `<div class="s-row-header ${!isLive ? 'past' : ''}">
                <div style="grid-column: 1 / span 2; font-size: 1.1em; font-weight: bold; color: var(--primary-text-color); white-space: nowrap; display: flex; align-items: baseline;">
                    ${esc(this.t('verbrauch'))} <span style="font-size: 10px; font-weight: normal; margin-left: 6px; color: var(--secondary-text-color);">&sum; ${sumAbfluss.toFixed(1)} kWh</span>
                </div>
                <div class="col-head">${esc(isLive ? this.t('heute') : this.t('gesamt'))}</div>
                ${isLive ? `<div class="col-head">${esc(this.t('live'))}</div>` : ''}
             </div>`;
    html += renderAccordion(isHausOpen, 'acc-haus', this.t('haus_gesamt'), getConf('haus_icon', 'mdi:home-lightning-bolt'), getValHist(this.config.haus_heute, dataTotals.totalHaus), getValLive(this.config.haus_live), this.hausSubsConfig, false);
    html += renderRow(getConf('einspeisung_icon', 'mdi:transmission-tower-export'), this.t('einspeisung'), getValHist(this.config.einspeisung_heute, dataTotals.totalEinsp), getValLive(this.config.einspeisung_live));
    html += renderRow(getConf('bat_lad_icon', 'mdi:battery-plus'), this.t('bat_lad'), getValHist(this.config.bat_lad_heute, dataTotals.totalBatLad), getValLive(this.config.bat_lad_live));
    
    if (isLive && this.config.temp_ohmpilot) html += renderRow('mdi:thermometer', tempName, '<div></div>', getValLive(this.config.temp_ohmpilot));
    
    const autarkyColor = this.getColorForPercentage(dataTotals.autarkie, 0);
    if (isLive) {
        html += renderRow('mdi:leaf', this.t('autarkie'), '<div></div>', `<div class="s-val" style="color:${autarkyColor};">${dataTotals.autarkie.toFixed(1)} %</div>`, false, false, autarkyColor);
    } else {
        html += renderRow('mdi:leaf', this.t('autarkie'), `<div class="s-val" style="color:${autarkyColor};">${dataTotals.autarkie.toFixed(1)} %</div>`, '', false, false, autarkyColor);
    }

    html += `</div></div>`;
    return html;
  }

  updateLiveUI() {
    if(!this._hass) return;
    
    let decH = parseInt(this.config.decimals_heute); if(isNaN(decH)) decH = 2;
    let decL = parseInt(this.config.decimals_live); if(isNaN(decL)) decL = 1;
    
    if(!this._liveNodes || this._liveNodes.length === 0) {
        this._liveNodes = Array.from(this.shadowRoot.querySelectorAll('.s-val[data-entity], .live-update-target'));
    }

    this._liveNodes.forEach(el => {
      const eId = el.dataset.entity;
      const isLive = el.dataset.islive === 'true';
      
      if (eId && this._hass.states[eId]) {
        const s = this._hass.states[eId];
        const val = parseFloat(s.state);
        
        if (!isNaN(val)) {
          let unit = s.attributes.unit_of_measurement || (isLive ? 'W' : 'kWh');
          if (eId === this.config.bat_soc) unit = '%';
          if (eId === this.config.temp_ohmpilot) unit = '°C';
          if (unit.toLowerCase() === 'mwh' && !isLive) { unit = 'MWh'; } 
          else if (!isLive && unit === 'W') { unit = 'kWh'; }
          
          const targetDec = isLive ? decL : decH;
          el.innerText = val.toLocaleString('de-DE', { minimumFractionDigits: targetDec, maximumFractionDigits: targetDec }) + ' ' + unit;
          
          if (el.dataset.isSoc === 'true' || eId === this.config.bat_soc) {
             const socColor = this.getColorForPercentage(val, 10);
             el.style.color = socColor;
             const row = el.closest('.s-row');
             if(row) {
                 const iconEl = row.querySelector('ha-icon');
                 if(iconEl) iconEl.style.color = socColor;
             }
          }
        } else {
            el.innerText = esc(s.state);
        }
      }
      
      if(!el.dataset.bound) {
          el.onclick = (e) => { 
              e.stopPropagation(); 
              this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: eId }, bubbles: true, composed: true })); 
          };
          el.dataset.bound = "true";
      }
    });
  }

  // 🚀 MISSING METHOD 1: WIEDERHERGESTELLT! 
  async fetchAndMapData(svgCont) {
    if (!this._hass) return null; 

    const y = this.currentDate.getFullYear();
    const m = this.currentDate.getMonth();
    
    const ents = { 
        pv: this.config.pv_heute, 
        netz: this.config.netz_heute, 
        ein: this.config.einspeisung_heute, 
        bEnt: this.config.bat_ent_heute, 
        bLad: this.config.bat_lad_heute, 
        haus: this.config.haus_heute 
    };
    
    const subEnts = {}; 
    this.hausSubsConfig.forEach(sub => { if(sub.heute) subEnts[sub.key] = sub.heute; });
    const pvSubEnts = {}; 
    this.pvSubsConfig.forEach(sub => { if(sub.heute) pvSubEnts[sub.key] = sub.heute; }); 
    
    if(this.config.bat_soc) ents.soc = this.config.bat_soc; 
    if(this.config.temp_ohmpilot) ents.temp = this.config.temp_ohmpilot;
    
    const eList = [...Object.values(ents), ...Object.values(subEnts), ...Object.values(pvSubEnts)].filter(e => e);
    const res = await EB_DataEngine.fetchChartData(this._hass, this.chartLevel, this.currentDate, eList);
    
    if (res === "error" || !res.data) { 
        svgCont.innerHTML = '<div style="color:var(--error-color); text-align:center; padding: 20px;">Daten konnten nicht geladen werden. Bitte prüfen Sie die Entitäten.</div>'; 
        return null; 
    }

    let points = [];
    if (this.chartLevel === 'total') { 
        for(let i=4; i>=0; i--) points.push({ label: (y - i).toString(), matchStart: (y - i), tDate: new Date(y-i, 0, 1) }); 
    } else if (this.chartLevel === 'year') { 
        const months = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']; 
        for(let i=0; i<12; i++) points.push({ label: months[i], matchStart: new Date(y, i, 1).getTime() }); 
    } else if (this.chartLevel === 'month') { 
        const dim = new Date(y, m + 1, 0).getDate(); 
        for(let i=1; i<=dim; i++) points.push({ label: i.toString(), matchStart: new Date(y, m, i).getTime(), tDate: new Date(y, m, i, 12) }); 
    } else { 
        for(let i=0; i<24; i++) points.push({ label: `${i}h`, matchStart: new Date(y, m, this.currentDate.getDate(), i).getTime() }); 
    }

    const mapData = (entityId, targetTime, isMean = false) => {
        if (!entityId || !res.data[entityId]) return 0;
        let val = 0, count = 0;
        
        res.data[entityId].forEach(entry => {
            const eDate = new Date(entry.ts);
            let match = false;
            
            if (this.chartLevel === 'total' && eDate.getFullYear() === targetTime) match = true;
            else if (this.chartLevel === 'year' && eDate.getMonth() === new Date(targetTime).getMonth() && eDate.getFullYear() === new Date(targetTime).getFullYear()) match = true;
            else if (this.chartLevel === 'month' && eDate.getDate() === new Date(targetTime).getDate() && eDate.getMonth() === new Date(targetTime).getMonth()) match = true;
            else if (this.chartLevel === 'day' && eDate.getHours() === new Date(targetTime).getHours() && eDate.getDate() === new Date(targetTime).getDate()) match = true;
            
            if (match) { 
                val += (isMean ? entry.mean : entry.val); 
                count++; 
            }
        });
        
        if (isMean && count > 0) return val / count;
        return val;
    };

    const now = new Date();
    
    let chartData = points.map((p, i) => {
        let smartLabel = p.label;
        if (this.chartLevel === 'day') {
            const dObj = new Date(p.matchStart);
            const dateStr = `${dObj.getDate().toString().padStart(2,'0')}.${(dObj.getMonth()+1).toString().padStart(2,'0')}.${dObj.getFullYear()}`;
            const h = dObj.getHours();
            const nextH = h === 23 ? 0 : h + 1;
            smartLabel = `${dateStr}, ${h.toString().padStart(2,'0')}:00 - ${nextH.toString().padStart(2,'0')}:00 Uhr`;
        } else if (this.chartLevel === 'month') {
            const dObj = new Date(p.matchStart);
            smartLabel = `${dObj.getDate().toString().padStart(2,'0')}.${(dObj.getMonth()+1).toString().padStart(2,'0')}.${dObj.getFullYear()}`;
        } else if (this.chartLevel === 'year') {
            const dObj = new Date(p.matchStart);
            const mNames = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
            smartLabel = `${mNames[dObj.getMonth()]} ${dObj.getFullYear()}`;
        }

        let d = { 
            idx: i,
            label: p.label, 
            smartLabel: smartLabel,
            tDate: p.tDate, 
            matchStart: p.matchStart, 
            pv: mapData(ents.pv, p.matchStart), 
            netz: mapData(ents.netz, p.matchStart), 
            bEnt: mapData(ents.bEnt, p.matchStart), 
            ein: mapData(ents.ein, p.matchStart), 
            bLad: mapData(ents.bLad, p.matchStart), 
            haus: mapData(ents.haus, p.matchStart), 
            soc: mapData(ents.soc, p.matchStart, true), 
            temp: mapData(ents.temp, p.matchStart, true), 
            autarkie: 0,
            subs: [], 
            pvSubs: [], 
            isFuture: false 
        };
        
        let sumSubs = 0; 
        this.hausSubsConfig.forEach(sub => { 
            let sVal = mapData(sub.heute, p.matchStart); 
            sumSubs += sVal; 
            d.subs.push({ key: sub.key, name: sub.name, val: sVal, color: sub.color, icon: sub.icon }); 
        }); 
        
        d.restHaus = Math.max(0, d.haus - sumSubs);
        d.autarkie = d.haus > 0 ? Math.max(0, Math.min(100, ((d.haus - d.netz) / d.haus) * 100)) : 0;
        
        this.pvSubsConfig.forEach(sub => { 
            let sVal = mapData(sub.heute, p.matchStart); 
            d.pvSubs.push({ key: sub.key, name: sub.name, val: sVal, color: sub.color, icon: sub.icon }); 
        });
        
        d.direktSolar = Math.max(0, d.haus - d.netz - d.bEnt);
        
        let calcPV = Math.max(0, d.haus - d.netz - d.bEnt) + d.bLad + d.ein; 
        if (calcPV > d.pv) d.pv = calcPV;
        
        if (this.chartLevel === 'day') {
            const currentHourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).getTime();
            d.isFuture = (p.matchStart > currentHourStart) || (p.matchStart === currentHourStart && d.haus === 0 && d.pv === 0 && d.netz === 0);
        } else if (this.chartLevel === 'month') {
            const currentDayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            d.isFuture = p.matchStart > currentDayStart;
        } else if (this.chartLevel === 'year') {
            const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
            d.isFuture = p.matchStart > currentMonthStart;
        } else if (this.chartLevel === 'total') {
            d.isFuture = p.matchStart > now.getFullYear();
        }
        
        return d;
    });

    return chartData;
  }

  // 🚀 MISSING METHOD 2: WIEDERHERGESTELLT!
  getSmoothCurve(points, bottomY) {
    if(points.length < 2) return "";
    const smoothFactor = 8; 
    let d = `M ${points[0].x},${points[0].y} `;
    
    for (let i = 0; i < points.length - 1; i++) {
        let p0 = i > 0 ? points[i - 1] : points[0]; 
        let p1 = points[i]; 
        let p2 = points[i + 1]; 
        let p3 = i < points.length - 2 ? points[i + 2] : p2;
        
        let cp1x = p1.x + (p2.x - p0.x) / smoothFactor; 
        let cp1y = p1.y + (p2.y - p0.y) / smoothFactor;
        let cp2x = p2.x - (p3.x - p1.x) / smoothFactor; 
        let cp2y = p2.y - (p3.y - p1.y) / smoothFactor;
        
        if (cp1y > bottomY) cp1y = bottomY; 
        if (cp2y > bottomY) cp2y = bottomY;
        
        d += `C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y} `;
    }
    return d;
  }

  async renderDashboard() {
    this._renderGen = (this._renderGen || 0) + 1;
    const currentGen = this._renderGen;

    if (!this._hass) return;

    this.shadowRoot.querySelectorAll('.eb-lvl-btn').forEach(b => {
        if (b.dataset.lvl === this.chartLevel) b.classList.add('active');
        else b.classList.remove('active');
    });

    const y = this.currentDate.getFullYear(), m = this.currentDate.getMonth();
    const months = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    let titleText = "";
    if (this.chartLevel === 'total') titleText = `${y - 4} - ${y}`;
    else if (this.chartLevel === 'year') titleText = y.toString();
    else if (this.chartLevel === 'month') titleText = `${months[m]} ${y}`;
    else titleText = `${this.currentDate.getDate()}. ${months[m]} ${y}`;
    
    this.shadowRoot.querySelector('#date-text').innerText = titleText;
    
    const input = this.shadowRoot.querySelector('#date-input');
    input.value = (new Date(this.currentDate - this.currentDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    const svgCont = this.shadowRoot.querySelector('#svg-container-alternativ');
    svgCont.innerHTML = '<div style="padding: 40px; text-align:center; color:var(--secondary-text-color);">Lade Daten...</div>';
    
    const chartData = await this.fetchAndMapData(svgCont); 
    
    if (this._renderGen !== currentGen) return;
    if (!chartData) return;

    const isDark = this._hass && this._hass.themes && this._hass.themes.darkMode;
    const getConf = (k, d) => (this.config && this.config[k] !== undefined) ? this.config[k] : d;
    const getColor = (key, def) => { if(isDark && this.config[key + '_dark']) return this.config[key+'_dark']; return (this.config && this.config[key]) ? this.config[key] : def; };

    const colNetz = getColor('color_netz', '#8b0000'); 
    const colBatEnt = getColor('color_bat_ent', '#3498db'); 
    const colPVDirekt = getColor('color_pv_direkt', '#f1c40f');
    const colBatLad = getColor('color_bat_lad', '#2980b9'); 
    const colEinsp = getColor('color_einsp', '#27ae60');
    const colHausLine = getColor('color_haus_line', '#000000'); 
    const colPVLine = getColor('color_pv_line', '#e67e22'); 
    const colBatSoc = getColor('color_bat_soc', '#9b59b6'); 
    const colTemp = getColor('color_temp', '#e74c3c');
    
    let totalPV = 0, totalHaus = 0, totalNetz = 0, totalBatLad = 0, totalBatEnt = 0, totalEinsp = 0;
    let subTotals = {}; let pvSubTotals = {};
    let maxTotal = 1;
    
    chartData.forEach(d => { 
        if(d.isFuture) return;
        totalPV += d.pv; totalHaus += d.haus; totalNetz += d.netz;
        totalBatLad += d.bLad; totalBatEnt += d.bEnt; totalEinsp += d.ein;
        
        if(d.subs) d.subs.forEach(s => subTotals[s.key] = (subTotals[s.key] || 0) + s.val);
        if(d.pvSubs) d.pvSubs.forEach(s => pvSubTotals[s.key] = (pvSubTotals[s.key] || 0) + s.val);

        let totalActivity = d.netz + d.bEnt + d.direktSolar + d.bLad + d.ein + d.haus + d.pv;
        d.isEmpty = (this.chartLevel !== 'day' && totalActivity === 0);

        let valNetz = this.hiddenSeries.has('netz') ? 0 : d.netz; let valBatEnt = this.hiddenSeries.has('batEnt') ? 0 : d.bEnt; let valPVDir = this.hiddenSeries.has('pvDirekt') ? 0 : d.direktSolar;
        let valBatLad = this.hiddenSeries.has('batLad') ? 0 : d.bLad; let valEinsp = this.hiddenSeries.has('einsp') ? 0 : d.ein; let valPVTotal = this.hiddenSeries.has('pvTotal') ? 0 : d.pv;
        
        let envelope = valNetz + valBatEnt + valPVDir + valBatLad + valEinsp;
        if (envelope > maxTotal) maxTotal = envelope; 
        if (valPVTotal > maxTotal) maxTotal = valPVTotal;
    }); 
    maxTotal = maxTotal * 1.15; 
    
    let autarkie = totalHaus > 0 ? Math.max(0, Math.min(100, ((totalHaus - totalNetz) / totalHaus) * 100)) : 0;
    
    const isTodayChart = (this.chartLevel === 'day' && this.currentDate.toDateString() === new Date().toDateString());
    const dataTotals = { totalPV, totalHaus, totalNetz, totalBatLad, totalBatEnt, totalEinsp, autarkie, subTotals, pvSubTotals };
    
    const accHaus = this.shadowRoot.querySelector('#acc-haus'); const accPv = this.shadowRoot.querySelector('#acc-pv');
    const isHausOpen = accHaus ? accHaus.open : this.isConfTrue('haus_start_open', true);
    const isPvOpen = accPv ? accPv.open : this.isConfTrue('pv_start_open', false);

    this.shadowRoot.querySelector('#eb-summary-area').innerHTML = this.generateSummaryHTML(isTodayChart, dataTotals, isHausOpen, isPvOpen);
    
    this._liveNodes = [];
    if (isTodayChart) this.updateLiveUI(); 

    const legendEl = this.shadowRoot.querySelector('#alt-legend');
    if (legendEl) {
        const tempName = (this.config && this.config.temp_name) ? this.config.temp_name : this.t('temperatur');
        let legHTML = `
            <div>
              <span class="leg-item ${this.hiddenSeries.has('haus') ? 'leg-hidden' : ''}" data-id="haus"><span style="color:${colHausLine}; font-weight:bold; font-size:16px;">▬</span> ${esc(this.t('haus_gesamt'))}</span> &nbsp;&nbsp;&nbsp; 
              <span class="leg-item ${this.hiddenSeries.has('pvTotal') ? 'leg-hidden' : ''}" data-id="pvTotal"><span style="color:${colPVLine}; font-weight:bold; font-size:16px;">▬</span> ${esc(this.t('pv_gesamt'))}</span>`;
        
        if (this.config.bat_soc) legHTML += `&nbsp;&nbsp;&nbsp; <span class="leg-item ${this.hiddenSeries.has('soc') ? 'leg-hidden' : ''}" data-id="soc"><span style="color:${colBatSoc}; font-weight:bold; font-size:16px;">--</span> SoC %</span>`;
        if (this.config.temp_ohmpilot) legHTML += `&nbsp;&nbsp;&nbsp; <span class="leg-item ${this.hiddenSeries.has('temp') ? 'leg-hidden' : ''}" data-id="temp"><span style="color:${colTemp}; font-weight:bold; font-size:16px;">--</span> ${esc(tempName)}</span>`;       

        legHTML += `</div>
            <div style="margin-top:6px;">
              <span class="leg-item ${this.hiddenSeries.has('netz') ? 'leg-hidden' : ''}" data-id="netz"><span style="color:${colNetz}; font-size:16px;">■</span> ${esc(this.t('netzbezug'))}</span> &nbsp;&nbsp;&nbsp; 
              <span class="leg-item ${this.hiddenSeries.has('batEnt') ? 'leg-hidden' : ''}" data-id="batEnt"><span style="color:${colBatEnt}; font-size:16px;">■</span> ${esc(this.t('bat_ent'))}</span> &nbsp;&nbsp;&nbsp; 
              <span class="leg-item ${this.hiddenSeries.has('pvDirekt') ? 'leg-hidden' : ''}" data-id="pvDirekt"><span style="color:${colPVDirekt}; font-size:16px;">■</span> ${esc(this.t('pv_direkt'))}</span> &nbsp;&nbsp;&nbsp;
              <span class="leg-item ${this.hiddenSeries.has('batLad') ? 'leg-hidden' : ''}" data-id="batLad"><span style="color:${colBatLad}; font-size:16px;">■</span> ${esc(this.t('bat_lad'))}</span> &nbsp;&nbsp;&nbsp; 
              <span class="leg-item ${this.hiddenSeries.has('einsp') ? 'leg-hidden' : ''}" data-id="einsp"><span style="color:${colEinsp}; font-size:16px;">■</span> ${esc(this.t('einspeisung'))}</span>
            </div>
        `;
        legendEl.innerHTML = legHTML;
        legendEl.querySelectorAll('.leg-item').forEach(item => { item.onclick = () => { const id = item.dataset.id; if(this.hiddenSeries.has(id)) this.hiddenSeries.delete(id); else this.hiddenSeries.add(id); this.renderDashboard(); }; });
    }

    const w = 1200, h = 420, padL = 60, padR = 60, padT = 30, padB = 40, drawW = w - padL - padR, drawH = h - padT - padB;
    const zeroY = padT + drawH; const space = (drawW / chartData.length);

    let svg = `<svg width="100%" viewBox="0 0 ${w} ${h}" style="font-family: sans-serif; display: block;" text-rendering="optimizeLegibility">`;
    
    for(let j=0; j<=4; j++) {
        let yG = zeroY - (j/4) * drawH; let valG = (j/4) * maxTotal;
        svg += `<line x1="${padL}" y1="${yG}" x2="${w-padR}" y2="${yG}" stroke="#aaaaaa" stroke-width="1" opacity="0.6" ${j>0?'stroke-dasharray="4 4"':''} />`;
        svg += `<text x="${padL - 10}" y="${yG}" fill="var(--secondary-text-color)" font-size="12" font-weight="bold" text-anchor="end" dominant-baseline="central">${valG.toFixed(1)}</text>`;
    }
    svg += `<text x="${padL - 10}" y="${padT - 15}" fill="var(--secondary-text-color)" font-size="12" font-weight="bold" text-anchor="end">kWh</text>`;

    if (this.config.bat_soc || this.config.temp_ohmpilot) {
        for(let j=0; j<=4; j++) {
            let yG = zeroY - (j/4) * drawH; let valRight = (j/4) * 100;
            svg += `<text x="${w - padR + 10}" y="${yG}" fill="var(--secondary-text-color)" font-size="12" font-weight="bold" text-anchor="start" dominant-baseline="central">${valRight}</text>`;
        }
        svg += `<text x="${w - padR + 10}" y="${padT - 15}" fill="var(--secondary-text-color)" font-size="12" font-weight="bold" text-anchor="start">% / °C</text>`;
    }

    if (this.chartLevel === 'day') {
        let pNetz = [], pBat = [], pSolar = [], pHausLine = [], pZero = [], pBatLad = [], pEinsp = [], pPVTotal = [], pSoC = [], pTemp = [];
        let lastValidCx = 0;
        
        chartData.forEach((d, i) => {
            if(d.isFuture) return; 
            const cx = padL + i * space + (space / 2);
            lastValidCx = cx; pZero.push({x: cx, y: zeroY});
            
            let valNetz = this.hiddenSeries.has('netz') ? 0 : d.netz; let valBatEnt = this.hiddenSeries.has('batEnt') ? 0 : d.bEnt; let valPVDir = this.hiddenSeries.has('pvDirekt') ? 0 : d.direktSolar;
            let valBatLad = this.hiddenSeries.has('batLad') ? 0 : d.bLad; let valEinsp = this.hiddenSeries.has('einsp') ? 0 : d.ein; let valHaus = this.hiddenSeries.has('haus') ? 0 : d.haus; let valPVTot = this.hiddenSeries.has('pvTotal') ? 0 : d.pv;
            
            pNetz.push({x: cx, y: zeroY - (valNetz / maxTotal * drawH)});
            pBat.push({x: cx, y: zeroY - ((valNetz + valBatEnt) / maxTotal * drawH)});
            pSolar.push({x: cx, y: zeroY - ((valNetz + valBatEnt + valPVDir) / maxTotal * drawH)});
            pHausLine.push({x: cx, y: zeroY - (valHaus / maxTotal * drawH)}); 
            pPVTotal.push({x: cx, y: zeroY - (valPVTot / maxTotal * drawH)});

            let baseHaus = (valNetz + valBatEnt + valPVDir); 
            pBatLad.push({x: cx, y: zeroY - ((baseHaus + valBatLad) / maxTotal * drawH)});
            pEinsp.push({x: cx, y: zeroY - ((baseHaus + valBatLad + valEinsp) / maxTotal * drawH)});
            
            if(!this.hiddenSeries.has('soc')) pSoC.push({x: cx, y: zeroY - (d.soc / 100 * drawH)});
            if(!this.hiddenSeries.has('temp')) pTemp.push({x: cx, y: zeroY - (d.temp / 100 * drawH)});
        });

        const drawSmoothAreaToZero = (pointsTop, color) => {
            if(pointsTop.length < 2) return;
            let dPath = this.getSmoothCurve(pointsTop, zeroY); let dRev = `L ${pZero[pZero.length-1].x},${pZero[pZero.length-1].y} `;
            for(let i = pZero.length-2; i >= 0; i--) { dRev += `L ${pZero[i].x},${pZero[i].y} `; }
            svg += `<path d="${dPath} ${dRev} Z" fill="${color}" opacity="0.85" />`;
        };

        const drawSmoothAreaBetween = (pointsTop, pointsBottom, color) => {
            if(pointsTop.length < 2) return;
            let dPath = this.getSmoothCurve(pointsTop, zeroY); let revBottom = pointsBottom.slice().reverse(); let dRev = this.getSmoothCurve(revBottom, zeroY);
            dRev = dRev.replace(/^M/, 'L'); svg += `<path d="${dPath} ${dRev} Z" fill="${color}" opacity="0.85" />`;
        }

        if(!this.hiddenSeries.has('pvDirekt')) drawSmoothAreaToZero(pSolar, colPVDirekt); 
        if(!this.hiddenSeries.has('batEnt')) drawSmoothAreaToZero(pBat, colBatEnt);   
        if(!this.hiddenSeries.has('netz')) drawSmoothAreaToZero(pNetz, colNetz);  

        if(!this.hiddenSeries.has('batLad')) drawSmoothAreaBetween(pBatLad, pSolar, colBatLad); 
        if(!this.hiddenSeries.has('einsp')) drawSmoothAreaBetween(pEinsp, pBatLad.length > 0 ? pBatLad : pSolar, colEinsp); 

        if (!this.hiddenSeries.has('haus') && pHausLine.length > 1) {
            let dHausBlack = this.getSmoothCurve(pHausLine, zeroY);
            svg += `<path d="${dHausBlack}" fill="none" stroke="#ffffff" stroke-width="5" opacity="1" />`;
            svg += `<path d="${dHausBlack}" fill="none" stroke="${colHausLine}" stroke-width="2" />`; 
        }
        if (!this.hiddenSeries.has('pvTotal') && pPVTotal.length > 1) {
            let dPVOrange = this.getSmoothCurve(pPVTotal, zeroY);
            svg += `<path d="${dPVOrange}" fill="none" stroke="${colPVLine}" stroke-width="3" />`; 
        }
        if (!this.hiddenSeries.has('soc') && pSoC.length > 1) {
            let dSoC = this.getSmoothCurve(pSoC, zeroY);
            svg += `<path d="${dSoC}" fill="none" stroke="${colBatSoc}" stroke-width="2" stroke-dasharray="6 4" />`; 
        }
        if (!this.hiddenSeries.has('temp') && pTemp.length > 1) {
            let dTemp = this.getSmoothCurve(pTemp, zeroY);
            svg += `<path d="${dTemp}" fill="none" stroke="${colTemp}" stroke-width="2" stroke-dasharray="2 4" stroke-linecap="round" />`; 
        }

        if (isTodayChart && lastValidCx > 0 && lastValidCx < drawW) {
            const centerY = padT + (drawH / 2);
            svg += `<line x1="${lastValidCx}" y1="${padT}" x2="${lastValidCx}" y2="${zeroY}" stroke="#7f8c8d" stroke-width="2" stroke-dasharray="4 4" />`;
            svg += `<rect x="${lastValidCx - 10}" y="${centerY - 22}" width="20" height="44" fill="#7f8c8d" rx="4" />`;
            svg += `<text x="${lastValidCx}" y="${centerY}" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle" dominant-baseline="central" transform="rotate(90, ${lastValidCx}, ${centerY})">${esc(this.t('jetzt'))}</text>`;
        }
        
    } else {
        const wBar = (drawW / chartData.length) * 0.7;
        let linePointsHaus = []; let linePointsPV = []; let linePointsSoC = []; let linePointsTemp = [];

        chartData.forEach((d, i) => {
            if(d.isFuture) return;
            const cx = padL + i * space + (space / 2); const leftX = cx - wBar/2;
            let curY = zeroY;
            
            let valNetz = this.hiddenSeries.has('netz') ? 0 : d.netz; let valBatEnt = this.hiddenSeries.has('batEnt') ? 0 : d.bEnt; let valPVDir = this.hiddenSeries.has('pvDirekt') ? 0 : d.direktSolar;
            let valBatLad = this.hiddenSeries.has('batLad') ? 0 : d.bLad; let valEinsp = this.hiddenSeries.has('einsp') ? 0 : d.ein;

            const drawBarLayer = (val, col) => { if (val <= 0) return; const bH = (val / maxTotal) * drawH; curY -= bH; svg += `<rect class="chart-bar" x="${leftX}" y="${curY}" width="${wBar}" height="${bH}" fill="${col}" rx="1" />`; };
            
            if(!d.isEmpty) {
                drawBarLayer(valNetz, colNetz); drawBarLayer(valBatEnt, colBatEnt); drawBarLayer(valPVDir, colPVDirekt);
                if(!this.hiddenSeries.has('haus')) linePointsHaus.push({x: cx, y: curY, isGap: false}); 
                if(!this.hiddenSeries.has('pvTotal')) linePointsPV.push({x: cx, y: zeroY - (d.pv / maxTotal * drawH), isGap: false});
                drawBarLayer(valBatLad, colBatLad); drawBarLayer(valEinsp, colEinsp);
                
                if(!this.hiddenSeries.has('soc')) linePointsSoC.push({x: cx, y: zeroY - (d.soc / 100 * drawH), isGap: false});
                if(!this.hiddenSeries.has('temp')) linePointsTemp.push({x: cx, y: zeroY - (d.temp / 100 * drawH), isGap: false});
            } else {
                if(!this.hiddenSeries.has('haus')) linePointsHaus.push({x: cx, y: 0, isGap: true}); 
                if(!this.hiddenSeries.has('pvTotal')) linePointsPV.push({x: cx, y: 0, isGap: true});
                if(!this.hiddenSeries.has('soc')) linePointsSoC.push({x: cx, y: 0, isGap: true}); 
                if(!this.hiddenSeries.has('temp')) linePointsTemp.push({x: cx, y: 0, isGap: true});
            }
        });

        const drawLineWithGaps = (points, color, dashed = false) => {
            if(points.length === 0) return;
            let pathD = ""; let first = true;
            points.forEach(p => { if (p.isGap) { first = true; } else { pathD += first ? `M ${p.x} ${p.y} ` : `L ${p.x} ${p.y} `; first = false; } });
            if(!dashed) svg += `<path d="${pathD}" fill="none" stroke="#ffffff" stroke-width="5" opacity="1" />`;
            svg += `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="2" ${dashed ? 'stroke-dasharray="4 4"' : ''} />`;
            if(!dashed) points.forEach(p => { if(!p.isGap) svg += `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${color}" stroke="#ffffff" stroke-width="1.5" />`; });
        };
        drawLineWithGaps(linePointsHaus, colHausLine);
        drawLineWithGaps(linePointsPV, colPVLine);
        drawLineWithGaps(linePointsSoC, colBatSoc, true);
        drawLineWithGaps(linePointsTemp, colTemp, true);
    }

    chartData.forEach((d, i) => {
        const cx = padL + i * space + (space / 2);
        if (this.chartLevel !== 'month' || i % 2 === 0) svg += `<text x="${cx}" y="${h - 10}" fill="var(--secondary-text-color)" font-size="12" font-weight="bold" text-anchor="middle">${esc(d.label)}</text>`;
        const safeData = encodeURIComponent(JSON.stringify(d));
        svg += `<rect class="hover-zone" x="${cx - space / 2}" y="0" width="${space}" height="${h}" fill="transparent" data-idx="${i}" data-info="${safeData}" />`;
    });

    svg += `</svg>`; 
    this.shadowRoot.querySelector('#svg-container-alternativ').innerHTML = svg;
  }
}

customElements.define('energiebilanz-card-editor', EnergiebilanzCardEditor);
customElements.define('energiebilanz-card', EnergiebilanzCard);