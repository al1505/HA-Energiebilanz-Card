# ALs Energiebilanz Card

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://hacs.xyz)
[![GitHub Release](https://img.shields.io/github/v/release/al1505/ALs-Homeassitant-Energiebilanz-Card?label=Version)](https://github.com/al1505/ALs-Homeassitant-Energiebilanz-Card/releases)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PayPal](https://img.shields.io/badge/PayPal-Donate-0070ba?logo=paypal&style=flat-square)](https://paypal.me/al1505)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=al1505&repository=ALs-Homeassitant-Energiebilanz-Card&category=plugin)

Eine hochperformante, interaktive Custom Card zur Visualisierung von Energieflüssen in Home Assistant. Perfekt für Photovoltaik, Batteriespeicher, Netzbezug und Hausverbrauch.

---

## ☕ Support

Wenn dir diese Card gefällt und du die Weiterentwicklung unterstützen möchtest:

[![Buy me a coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-PayPal-0070ba?logo=paypal&style=for-the-badge)](https://paypal.me/al1505)

Direkt-Link: **[paypal.me/al1505](https://paypal.me/al1505)** ❤️

---

## ✨ Features

* 📱 **Mobile First UX:** Spezielles Touch-Design. Details öffnen sich auf dem Smartphone in einem nativen Bottom-Sheet am unteren Bildschirmrand.
* 👆 **Wischgesten (Swipe):** Wechsle Tage, Monate oder Jahre durch einfaches Wischen nach links oder rechts.
* 🖱️ **Desktop Optimiert:** Direkter Drill-Down per Mausklick in tiefere Zeiträume und smarte Hover-Tooltips.
* 🎨 **Dark Mode:** Automatische Theme-Erkennung. Farben für Light- und Dark-Mode können separat konfiguriert werden.
* 📊 **Detailansicht:** Visualisiert Autarkie, Batterie-SoC, Temperaturen und detaillierte Verbraucher (z.B. Wärmepumpe) in übersichtlichen Listen und Kuchendiagrammen.
* ⚙️ **Visueller Editor:** Vollständige Unterstützung für den UI-Editor in Home Assistant. Kein YAML-Schreiben nötig.
* ⚡ **Enterprise Performance:** Kapselung durch Shadow DOM, Schutz vor Race-Conditions und sauberes Memory Management.

## 📦 Installation

### Methode 1: HACS (Empfohlen)

Klicke einfach auf den blauen Button ganz oben. 
Alternativ:
1. Öffne HACS in Home Assistant.
2. Klicke oben rechts auf das Drei-Punkte-Menü und wähle **Benutzerdefinierte Repositories**.
3. Füge die URL dieses Repositories ein und wähle die Kategorie **Lovelace** (oder Dashboard).
4. Klicke auf Herunterladen.
5. Lade die Seite deines Browsers neu.

### Methode 2: Manuell

1. Lade die Datei `ha-energiebilanz-card.js` herunter.
2. Erstelle in Home Assistant den Ordnerpfad `/config/www/community/ha-energiebilanz-card/` (falls noch nicht vorhanden).
3. Lege die JS-Datei genau dort ab.
4. Gehe in Home Assistant zu Einstellungen -> Dashboards -> Drei-Punkte-Menü oben rechts -> Ressourcen.
5. Füge eine neue Ressource hinzu: 
   * URL: `/local/community/ha-energiebilanz-card/ha-energiebilanz-card.js`
   * Typ: `JavaScript-Modul`

## 🛠️ Konfiguration

Gehe in dein Dashboard, klicke auf "Karte hinzufügen" und suche nach "Energiebilanz". Alle Sensoren, Farben und Beschriftungen kannst du direkt in der grafischen Oberfläche einstellen.

*Hinweis: Die Karte nutzt den internen Recorder von Home Assistant. Deine Sensoren müssen historische Daten aufzeichnen (z.B. `state_class: total_increasing`).*

## 📸 Screenshots

<details open>
<summary><b>🖥️ 1. Desktop-Ansicht</b></summary>

<img width="450" height="399" alt="Desktop — Tagesansicht" src="https://github.com/user-attachments/assets/f99d5819-6d4f-4676-92d6-913c02da0316" />
<img width="450" height="464" alt="Desktop — Tagesansicht aufgeklappt" src="https://github.com/user-attachments/assets/0503f3c6-4da9-43a0-8fad-31fd11195655" />
<img width="450" height="399" alt="Desktop — Detailansicht" src="https://github.com/user-attachments/assets/65c16eb4-b636-49aa-8853-c3d7ec9ab7ca" />
<img width="450" height="383" alt="Desktop — Monatsansicht" src="https://github.com/user-attachments/assets/0be17e00-f464-450f-9f07-384260884ff8" />

</details>

<details>
<summary><b>📱 2. Mobile-Ansicht</b></summary>

![Mobile — Tagesansicht](https://github.com/user-attachments/assets/dc48830a-6681-4767-88e3-56731433a2c8)
![Mobile — Tagesdetails](https://github.com/user-attachments/assets/543b602d-4fbd-46c9-8d94-07ff1417015a)
![Mobile — Monatsansicht](https://github.com/user-attachments/assets/b0f979f7-f72c-4834-b1ea-18f4aa8ef0c0)
![Mobile — Monatsdetails](https://github.com/user-attachments/assets/d412c79b-5ad7-4859-b761-c99d02f4c57d)

</details>

<details>
<summary><b>⚙️ 3. Konfiguration (Visueller Editor)</b></summary>

<img width="450" height="499" alt="Editor — Haupt-Sensoren" src="https://github.com/user-attachments/assets/09eb9ada-adc3-4528-b80a-0dcd8f58fe4e" />
<img width="900" height="1002" alt="Editor — Vollansicht" src="https://github.com/user-attachments/assets/b9aa0c37-5a71-4a00-bf16-0cfa228be141" />
<img width="200" height="203" alt="Editor — Kompakt" src="https://github.com/user-attachments/assets/0a06c484-d43d-4b42-a8e5-44f4d51a37a7" />
<img width="400" height="599" alt="Editor — Sub-Einträge" src="https://github.com/user-attachments/assets/878af6a2-59cb-4d35-9981-3b0ceeb2587c" />

</details>

---

## 🙏 Danke

Wenn dir die Card im Alltag hilft → freue ich mich über einen kleinen Kaffee:

[![Buy me a coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-PayPal-0070ba?logo=paypal&style=for-the-badge)](https://paypal.me/al1505)

**[paypal.me/al1505](https://paypal.me/al1505)** ☕

---

*Entwickelt mit ❤️ von [al1505](https://github.com/al1505)*




