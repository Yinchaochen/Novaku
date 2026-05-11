// Plain-language Terms of Use and Privacy Policy for Postervia.
//
// Format: lightweight markdown that LegalDocumentBody renders.
//   `## ` at line start  → section heading
//   blank line           → paragraph break
//   `- ` at line start   → bullet item
//
// Anchor for "last updated" — bump when any body string materially changes.
export const LEGAL_LAST_UPDATED = 'May 11, 2026';

// Operator identity. Until Persterna GmbH is registered, the individual
// developer (Yinchao Chen) is the responsible party for GDPR, App Store
// listing, and consumer contracts. Both English and German bodies reference
// the same person.
//
// When Persterna is incorporated, replace this section with the company
// name + Handelsregister number and bump LEGAL_LAST_UPDATED.

// ─────────────────────────────────────────────────────────────────────────────
// PRIVACY POLICY — English
// ─────────────────────────────────────────────────────────────────────────────

const PRIVACY_POLICY_EN = `## Introduction

Postervia is a mobile application built and operated by Yinchao Chen, an individual developer based in Berlin, Germany ("we", "us", or "our"). Postervia helps people who have moved to or are traveling through a new city — starting with Berlin — by sharing local guides, organizing tasks, and connecting with companions for in-person errands or trips.

This Privacy Policy explains what personal data we collect when you use Postervia, why we collect it, who we share it with, and what rights you have. We wrote it in plain English. If anything is unclear, email privacy@novaku.app.

**Note on the operator:** We are in the process of incorporating a German legal entity called Persterna. Until that registration is complete, the individual developer named above is the data controller for the purposes of the GDPR. When the company is registered, we will update this Policy to reflect the new entity, notify you in the app, and ask for fresh consent where the law requires it.

This Policy applies to the Postervia mobile app and any related services we offer under the Postervia brand. It does not apply to third-party websites or apps you reach through links inside Postervia.

## Information we collect

We collect information in three ways: information you give us, information that's generated automatically while you use the app, and information we receive from third parties.

**Information you give us when you create an account**

- Email address and password (or, if you sign in with Google or Apple, the identifier and email those providers share with us)
- Display name and a numeric display ID we generate for you
- Date of birth (used to confirm you meet the minimum age and to compute your birth year)
- Gender (one of male, female, non-binary, or prefer-not-to-say)
- Your preferred app language

**Information you give us during onboarding and on your profile**

- Current city and (optionally) origin city
- Identity (newcomer, resident, traveler, or local) and intent tags (study, work, travel, settle down)
- Profile photo (uploaded to our media storage)
- Short bio
- Privacy preferences for which profile tabs (notes, comments, saves, likes) are visible to others

**Information you give us when you use the service**

- Posts you create on Plaza: title, body, type (experience, question, guide, warning, recommendation), associated city, photos, and any source URL you attach
- Comments and replies on other people's posts
- Buddy posts you publish: category, title, body, time window, departure and return cities, price, and currency
- Chat messages you send (text, images, voice clips, stickers, memos, location pins, sticker uploads)
- Documents you upload to Scribe for AI-assisted interpretation
- Tasks you add to or complete in your personal task list, including notes you save against a task
- Reports you submit when flagging content or accounts

**Information you give us when you pay**

- We use Stripe to process subscription payments for Postervia+. We do not see or store your card number, CVV, or full bank details. Stripe gives us a customer reference, your subscription status, the amount and currency of each charge, and whether a payment succeeded or failed.

**Information collected automatically when you use the app**

- Device information: device model, operating system version, app version, language, time zone, screen size, and a device identifier scoped to Postervia
- Approximate location: if you grant the location permission during onboarding or later, we store the latitude and longitude you confirm. You can also enter your city manually without sharing precise location.
- Interaction events on Plaza: which cards you saw (impressions), how long you viewed a post (dwell time), and whether you marked it helpful, saved it, added it to your tasks, hid it, or reported it. We use these signals to rank what we show you. We keep these events for 180 days and then delete them.
- Crash reports and basic diagnostic logs so we can fix bugs
- IP address, which we use briefly for security checks and to localize content; we do not build a long-term log of your IP history

**Information from third parties**

- If you sign in with Google or Apple, those providers tell us your verified email address and a stable user identifier so we can link sessions to your account
- If a friend invites you or you scan another user's QR code, we associate your account with that introduction so the friend graph works

## How we use your information

We use your information to operate Postervia and to keep it safe. Specifically:

**To run the core service** — let you sign in, post on Plaza, message friends, create buddy posts, manage your task list, upload documents, and customize your profile.

**To personalize what you see** — Plaza recommendations are ranked using a mix of your city, identity, the intent tags you chose, what you've engaged with, and the trust score we compute for content authors. The recommendation algorithm aims to show "need-first" information first, then locally adjacent content, then a small share of curiosity content. You can read more in our DSA transparency report.

**To translate posts and comments** — when you view content originally written in another language, we may send the text to DeepL or to OpenAI to produce a translation in your preferred app language. We send only the text being translated, not your account identity.

**To interpret documents you upload to Scribe** — we send the document image to Google Vision to extract text via OCR, then to OpenAI to produce a structured summary and action list. We send only the file you chose to upload; we do not silently scan your photo library.

**To answer questions and look up current local information** — features that need fresh facts may send your prompt to Perplexity or Tavily; we send only the wording of your prompt, not your full account history.

**To process payments** — Stripe charges, refunds, and manages subscription lifecycle events on our behalf.

**To send important messages** — we send transactional emails for sign-up, password reset, payment receipts, and account-deletion confirmations. If you opted in during sign-up, we may also send occasional product updates; you can unsubscribe at any time from the email footer or in Settings.

**To keep Postervia safe** — we use account, content, and behavioral signals to detect spam, scraping, harassment, impersonation, and illegal content. We may temporarily restrict accounts that appear to be automated or abusive.

**To improve the product** — we look at aggregated, de-identified interaction patterns to understand which features are useful and where the experience breaks.

**To comply with legal obligations** — including responding to lawful requests from authorities and meeting tax, accounting, and consumer-protection rules.

## Legal bases for processing (GDPR)

We rely on the following legal bases under Article 6 of the EU General Data Protection Regulation:

- **Performance of a contract (Art. 6(1)(b))** — for account creation, hosting your posts and chats, processing your subscription, and delivering features you've asked for.
- **Consent (Art. 6(1)(a))** — for optional marketing emails, optional precise-location use, and any cookies or analytics that aren't strictly necessary. You can withdraw consent at any time without affecting prior processing.
- **Legitimate interest (Art. 6(1)(f))** — for anti-abuse, fraud prevention, ranking quality, and aggregate analytics, where these don't override your fundamental rights.
- **Legal obligation (Art. 6(1)(c))** — for tax records, lawful access requests, and statutory retention requirements.

For special categories of data — we do not deliberately collect health, religious, political, or sexual-orientation data. If you choose to share something like that in a post or message, you are doing so publicly or to a specific recipient on your own initiative, and Article 9(2)(e) applies.

## Who we share information with

We do not sell your personal data. We share it only in the narrow ways described below.

**With other Postervia users**

- Your display name, display ID, profile photo, city, identity tag, bio, and the tabs you've made public are visible to anyone who finds your profile in the app.
- Posts and buddy posts you publish are visible to all users of the app, subject to your privacy preferences.
- Comments and reactions you leave are attached to your profile.
- If you chat one-on-one or in a group, the other participants see your messages.

**With service providers (processors acting under our instructions)**

- **Cloudflare R2** stores the media you upload (photos, voice clips, stickers, document scans).
- **Stripe** processes subscription payments and stores your billing relationship.
- **OpenAI** (model gpt-5.4-mini and successors) interprets documents you submit to Scribe and powers AI Copilot.
- **Google Vision** performs OCR on documents you submit to Scribe.
- **DeepL** translates posts, comments, and messages on demand.
- **Perplexity** and **Tavily** answer queries that require fresh real-world information.
- **Google Sign-In** and **Apple Sign-In** authenticate users who choose those flows.
- Standard infrastructure providers (hosting, email delivery, error reporting, push-notification delivery) under written data-processing agreements.

We require every processor to handle your data only on documented instructions, to apply appropriate security, and to delete the data when our agreement ends.

**With authorities, when legally required**

- We disclose data only when we receive a valid legal request (court order, subpoena, or other binding instrument) or when we believe in good faith that disclosure is necessary to prevent imminent harm.

**In a business transfer**

- If the Postervia product is acquired, merged, or sold — including the upcoming transfer from the individual developer to Persterna once the company is registered — your data may transfer to the new entity. We will tell you in advance and you can delete your account before the transfer takes effect.

## International data transfers

Some of our service providers — including OpenAI, Stripe, Google, and DeepL — process data outside the European Economic Area. Where that's the case, we rely on the European Commission's Standard Contractual Clauses (SCCs) and, for U.S. transfers, the EU-U.S. Data Privacy Framework, to ensure the transfer meets EU standards. You can request a copy of the safeguards by emailing privacy@novaku.app.

## How long we keep your information

We keep different categories of data for different periods:

- **Account profile** — for as long as your account exists. After deletion, we keep a minimal record (your numeric display ID and the fact that an account once existed) for up to 30 days so we can finish processing requests, then we hard-delete it.
- **Posts, comments, and chat messages you create** — for as long as your account exists. When you delete a post, comment, or chat message, we remove it from the app immediately; backups containing it are overwritten within 30 days.
- **Recommendation events** (impressions, dwell, helpful, saves, hides, reports) — 180 days, then automatically deleted.
- **Author trust score** — recomputed nightly from a rolling 60-day event window. The current score is kept while your account exists.
- **Buddy posts** — active posts disappear from the feed when they expire (the time window or return date has passed). The database row is retained for safety review and to inform future recommendations, unless you ask us to delete it.
- **Payment records** — we keep invoices and tax records for the period required by German and EU law (currently 10 years for VAT records under § 147 AO).
- **Diagnostic logs and crash reports** — up to 90 days.
- **Reports you file or that are filed against you** — retained while the report is open and for up to 12 months after resolution.

After legal hold periods elapse, data is automatically purged by scheduled jobs.

## Your rights

If you are in the European Union, United Kingdom, or another jurisdiction with comparable privacy laws, you have the following rights:

- **Right to access** (Art. 15 GDPR) — request a copy of the personal data we hold about you.
- **Right to rectification** (Art. 16) — correct inaccurate or incomplete data.
- **Right to erasure** (Art. 17) — ask us to delete your account and associated data, with a 30-day grace period during which you can cancel the request.
- **Right to restriction** (Art. 18) — ask us to limit how we use your data while a dispute is resolved.
- **Right to portability** (Art. 20) — receive your data in a structured, machine-readable JSON archive.
- **Right to object** (Art. 21) — object to processing based on our legitimate interests, including the personalization of Plaza recommendations.
- **Right to withdraw consent** — at any time, where we relied on your consent.
- **Right to complain** — lodge a complaint with your national data-protection authority. In Berlin, that is the Berlin Commissioner for Data Protection and Freedom of Information (BlnBDI, https://www.datenschutz-berlin.de). At the federal level, the BfDI (https://www.bfdi.bund.de).

You can exercise the access, portability, erasure, rectification, and restriction rights directly in Postervia under Settings → Privacy → Data. We respond within 30 days as required by Article 12(3) GDPR.

## Children

Postervia is intended for users aged 16 and over. We do not knowingly collect data from anyone under 16. If you are under 16, please do not register or use the app.

When you sign up, we ask for your date of birth. If you appear to be under 16, we will not create an account. If we later learn that a registered user is under 16, we will delete the account and associated data.

## Security

We protect your data with industry-standard measures: encrypted connections (TLS) between the app and our servers, encryption at rest for stored media, hashed passwords using a modern algorithm (Argon2), short-lived authentication tokens stored on your device using the operating system's secure storage, and access controls that limit who can see production data. No system is perfectly secure, but we take measured engineering and operational steps to reduce risk.

If we detect a personal-data breach that creates a meaningful risk to your rights, we will notify the relevant data-protection authority within 72 hours and, where required, notify affected users directly.

## Cookies and similar technologies

The Postervia mobile app does not use browser cookies. We do use a small number of device-scoped identifiers and storage mechanisms:

- A persistent installation ID generated by the operating system, used to deliver push notifications to your device.
- Secure local storage for your authentication tokens, kept inside the OS keychain or KeyStore.
- Local app cache used to speed up the feed and avoid re-downloading the same images.

You can clear app data through your device settings at any time. Doing so will sign you out.

## Changes to this Policy

We may update this Policy as we add features, as the law changes, or when Persterna is incorporated and the operator identity changes. When we do, we will:

- Update the "Last updated" date at the top of this document.
- Notify you inside the app if the change is material.
- For changes that require it under GDPR, ask for fresh consent.

## Contact us

For privacy questions, requests, or complaints:

- Email: privacy@novaku.app
- Postal address: see the Impressum at Settings → Legal → Imprint

We aim to respond within 7 calendar days for routine requests and within 30 days for formal data-subject requests as required by GDPR.
`;

// ─────────────────────────────────────────────────────────────────────────────
// PRIVACY POLICY — German (Datenschutzerklärung)
// ─────────────────────────────────────────────────────────────────────────────
// This is a translated equivalent of PRIVACY_POLICY_EN, adapted to German
// legal vocabulary (DSGVO instead of GDPR, "betroffene Person", "Art. 6 Abs. 1
// lit. b DSGVO" instead of "Art. 6(1)(b)"). A native German speaker or lawyer
// should review this once before any wider release; both versions are
// substantively the same.

const PRIVACY_POLICY_DE = `## Einleitung

Postervia ist eine mobile Anwendung, die von Yinchao Chen, einem in Berlin ansässigen Einzelentwickler, betrieben wird („wir", „uns" bzw. „unser"). Postervia hilft Menschen, die in eine neue Stadt gezogen sind oder durch sie reisen — beginnend mit Berlin — indem sie lokale Anleitungen teilt, Aufgaben organisiert und Begleitpersonen für Erledigungen oder Reisen vor Ort vermittelt.

Diese Datenschutzerklärung erläutert, welche personenbezogenen Daten wir bei der Nutzung von Postervia erheben, warum wir sie erheben, an wen wir sie weitergeben und welche Rechte du hast. Wir haben sie in klarer Sprache verfasst. Bei Unklarheiten schreibe an privacy@novaku.app.

**Hinweis zum Verantwortlichen:** Wir bereiten derzeit die Gründung einer deutschen Gesellschaft namens Persterna vor. Bis zur Eintragung ist der oben genannte Einzelentwickler der Verantwortliche im Sinne der DSGVO. Sobald die Gesellschaft eingetragen ist, aktualisieren wir diese Erklärung, weisen dich in der App darauf hin und holen, soweit gesetzlich erforderlich, eine erneute Einwilligung ein.

Diese Erklärung gilt für die Postervia-App und alle damit verbundenen Dienste unter der Marke Postervia. Sie gilt nicht für Websites oder Apps Dritter, die du über Links innerhalb von Postervia erreichst.

## Welche Daten wir erheben

Wir erheben Daten auf drei Wegen: Daten, die du uns selbst gibst, Daten, die bei deiner Nutzung der App automatisch entstehen, und Daten, die wir von Dritten erhalten.

**Daten, die du uns bei der Registrierung gibst**

- E-Mail-Adresse und Passwort (oder, falls du dich mit Google bzw. Apple anmeldest, die Kennung und E-Mail-Adresse, die diese Anbieter mit uns teilen)
- Anzeigename und eine von uns vergebene numerische Display-ID
- Geburtsdatum (zur Prüfung des Mindestalters und zur Berechnung deines Geburtsjahres)
- Geschlecht (männlich, weiblich, nicht-binär oder „keine Angabe")
- Deine bevorzugte App-Sprache

**Daten, die du beim Onboarding und im Profil angibst**

- Aktuelle Stadt und (optional) Herkunftsstadt
- Identität (Neuankömmling, Resident, Reisende, Local) und Intent-Tags (Studium, Arbeit, Reise, sesshaft werden)
- Profilbild (in unserem Medien-Speicher abgelegt)
- Kurze Bio
- Sichtbarkeitseinstellungen für deine Profil-Tabs (Notizen, Kommentare, Gespeichertes, Likes)

**Daten, die bei der Nutzung des Dienstes entstehen**

- Beiträge auf Plaza: Titel, Text, Typ (Erfahrung, Frage, Anleitung, Warnung, Empfehlung), zugeordnete Stadt, Fotos sowie angehängte Quell-URLs
- Kommentare und Antworten auf Beiträge anderer Nutzer
- Buddy-Posts, die du veröffentlichst: Kategorie, Titel, Text, Zeitfenster, Abreise-/Zielstadt, Preis und Währung
- Chat-Nachrichten (Text, Bilder, Sprachnachrichten, Sticker, Memos, Standort-Pins, Sticker-Uploads)
- Dokumente, die du in Scribe zur KI-gestützten Auswertung hochlädst
- Aufgaben in deiner persönlichen Aufgabenliste sowie zugehörige Notizen
- Meldungen, die du zu Inhalten oder Konten einreichst

**Daten, die bei Bezahlung entstehen**

- Wir nutzen Stripe zur Abwicklung von Postervia+-Abonnements. Wir sehen oder speichern weder Kartennummer, CVV noch vollständige Bankdaten. Stripe gibt uns eine Kundenreferenz, deinen Abo-Status, Betrag und Währung jeder Belastung sowie Erfolg oder Misserfolg einer Zahlung weiter.

**Automatisch erhobene Daten**

- Geräteinformationen: Gerätemodell, Betriebssystemversion, App-Version, Sprache, Zeitzone, Bildschirmgröße sowie eine auf Postervia beschränkte Geräte-ID
- Ungefährer Standort: Wenn du beim Onboarding oder später die Standortberechtigung erteilst, speichern wir die von dir bestätigten Koordinaten. Du kannst deine Stadt auch manuell eingeben, ohne den genauen Standort zu teilen.
- Interaktions-Events auf Plaza: welche Karten dir angezeigt wurden (Impressionen), wie lange du einen Beitrag betrachtet hast (Verweildauer), ob du ihn als hilfreich markiert, gespeichert, zu deinen Aufgaben hinzugefügt, verborgen oder gemeldet hast. Wir nutzen diese Signale zur Reihenfolge der Empfehlungen. Wir bewahren diese Events 180 Tage auf und löschen sie dann automatisch.
- Absturzberichte und einfache Diagnose-Logs zur Fehlerbehebung
- IP-Adresse, kurzfristig für Sicherheitsprüfungen und Lokalisierung; wir führen kein Langzeit-Protokoll deiner IP-Adressen.

**Daten von Dritten**

- Bei Anmeldung mit Google oder Apple übermitteln uns diese Anbieter deine verifizierte E-Mail-Adresse und eine stabile Nutzerkennung, damit wir Sitzungen deinem Konto zuordnen können.
- Wenn ein Kontakt dich einlädt oder du den QR-Code einer anderen Person scannst, verknüpfen wir dein Konto mit dieser Einführung, damit der Freundesgraph funktioniert.

## Wie wir deine Daten verwenden

Wir verwenden deine Daten, um Postervia zu betreiben und sicher zu halten. Konkret:

**Zum Betrieb des Kerndienstes** — damit du dich anmelden, auf Plaza posten, mit Freunden chatten, Buddy-Posts erstellen, deine Aufgabenliste verwalten, Dokumente hochladen und dein Profil anpassen kannst.

**Zur Personalisierung der Inhalte** — Plaza-Empfehlungen werden anhand deiner Stadt, Identität, gewählten Intent-Tags, bisheriger Interaktionen und des von uns berechneten Vertrauenswerts der Autoren sortiert. Das Empfehlungssystem zeigt zuerst „bedarfsgerechte" Informationen, dann lokal verwandte Inhalte und schließlich einen kleinen Anteil neugierde-orientierter Inhalte. Mehr dazu im DSA-Transparenzbericht.

**Zur Übersetzung von Beiträgen und Kommentaren** — wenn du Inhalte in einer Fremdsprache ansiehst, senden wir den Text an DeepL oder OpenAI, um eine Übersetzung in deine bevorzugte App-Sprache zu erzeugen. Wir senden nur den zu übersetzenden Text, nicht deine Kontoidentität.

**Zur Auswertung von Scribe-Dokumenten** — wir senden das Dokumentbild an Google Vision zur Texterkennung (OCR), anschließend an OpenAI für eine strukturierte Zusammenfassung und Handlungsliste. Wir senden nur die Datei, die du ausgewählt hast; wir durchsuchen nicht heimlich deine Fotomediathek.

**Zur Beantwortung von Fragen und Abruf aktueller lokaler Informationen** — Funktionen, die aktuelle Fakten benötigen, senden deine Anfrage an Perplexity oder Tavily; wir übermitteln nur den Wortlaut deiner Anfrage, nicht deinen gesamten Kontoverlauf.

**Zur Zahlungsabwicklung** — Stripe bucht ab, erstattet und verwaltet Abonnement-Ereignisse in unserem Auftrag.

**Zum Versand wichtiger Nachrichten** — wir senden transaktionale E-Mails zur Registrierung, Passwortzurücksetzung, Zahlungsquittungen und Kontolöschung. Wenn du bei der Registrierung zugestimmt hast, senden wir gelegentlich Produkt-Updates; du kannst dich jederzeit über den E-Mail-Footer oder in den Einstellungen abmelden.

**Zum Schutz von Postervia** — wir nutzen Konto-, Inhalts- und Verhaltenssignale, um Spam, Scraping, Belästigung, Identitätsmissbrauch und illegale Inhalte zu erkennen. Konten, die automatisiert oder missbräuchlich wirken, können wir vorübergehend einschränken.

**Zur Produktverbesserung** — wir betrachten aggregierte, anonymisierte Nutzungsmuster, um zu verstehen, welche Funktionen nützlich sind und wo die Erfahrung scheitert.

**Zur Erfüllung gesetzlicher Pflichten** — einschließlich der Beantwortung rechtmäßiger behördlicher Anfragen sowie steuer-, buchhaltungs- und verbraucherschutzrechtlicher Vorgaben.

## Rechtsgrundlagen (DSGVO)

Wir stützen uns auf folgende Rechtsgrundlagen nach Artikel 6 DSGVO:

- **Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO)** — für Kontoerstellung, Hosting deiner Beiträge und Chats, Abwicklung deines Abonnements und Bereitstellung gewünschter Funktionen.
- **Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)** — für optionale Marketing-E-Mails, optionale präzise Standortdaten sowie nicht notwendige Cookies oder Analysen. Du kannst die Einwilligung jederzeit ohne Auswirkung auf bisherige Verarbeitungen widerrufen.
- **Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO)** — zur Missbrauchsabwehr, Betrugsprävention, Empfehlungsqualität und aggregierten Analyse, soweit deine Grundrechte nicht überwiegen.
- **Rechtliche Verpflichtung (Art. 6 Abs. 1 lit. c DSGVO)** — für Steuerunterlagen, behördliche Auskunftsersuchen und gesetzliche Aufbewahrungspflichten.

Für besondere Kategorien personenbezogener Daten — wir erheben bewusst keine Gesundheits-, Religions-, politischen oder sexuellen Orientierungsdaten. Teilst du derartige Daten von dir aus in einem Beitrag oder einer Nachricht, geschieht dies auf deine eigene Initiative; einschlägig ist Art. 9 Abs. 2 lit. e DSGVO.

## Mit wem wir Daten teilen

Wir verkaufen deine personenbezogenen Daten nicht. Wir geben sie nur in den folgenden engen Fällen weiter.

**An andere Postervia-Nutzer**

- Anzeigename, Display-ID, Profilbild, Stadt, Identitäts-Tag, Bio und die von dir öffentlich gestellten Tabs sind für jeden sichtbar, der dein Profil in der App findet.
- Von dir veröffentlichte Beiträge und Buddy-Posts sind für alle Nutzer der App sichtbar, vorbehaltlich deiner Sichtbarkeitseinstellungen.
- Deine Kommentare und Reaktionen sind deinem Profil zugeordnet.
- In Einzel- oder Gruppenchats sehen die Teilnehmer deine Nachrichten.

**An Auftragsverarbeiter (handeln nach unseren Weisungen)**

- **Cloudflare R2** speichert hochgeladene Medien (Fotos, Sprachnachrichten, Sticker, Dokument-Scans).
- **Stripe** wickelt Abonnementzahlungen ab und speichert die Vertragsbeziehung.
- **OpenAI** (Modell gpt-5.4-mini und Nachfolger) wertet Scribe-Dokumente aus und betreibt den AI Copilot.
- **Google Vision** führt OCR auf Scribe-Dokumenten durch.
- **DeepL** übersetzt Beiträge, Kommentare und Nachrichten auf Anforderung.
- **Perplexity** und **Tavily** beantworten Anfragen, die aktuelle Informationen benötigen.
- **Google Sign-In** und **Apple Sign-In** authentifizieren Nutzer, die diese Verfahren wählen.
- Standard-Infrastrukturanbieter (Hosting, E-Mail-Zustellung, Fehler-Reporting, Push-Benachrichtigungen) auf Basis schriftlicher Auftragsverarbeitungsverträge.

Wir verpflichten jeden Auftragsverarbeiter, deine Daten ausschließlich auf dokumentierte Weisung zu verarbeiten, angemessene Sicherheitsmaßnahmen anzuwenden und die Daten nach Vertragsende zu löschen.

**An Behörden, wenn gesetzlich vorgeschrieben**

- Wir geben Daten nur weiter, wenn ein wirksames rechtliches Ersuchen vorliegt (Gerichtsbeschluss, Vorladung oder anderes bindendes Instrument) oder wenn wir in gutem Glauben annehmen, dass die Offenlegung zur Abwendung unmittelbaren Schadens erforderlich ist.

**Bei Geschäftsübergang**

- Wird das Produkt Postervia übernommen, fusioniert oder verkauft — einschließlich der bevorstehenden Übertragung vom Einzelentwickler auf Persterna nach deren Eintragung — können deine Daten an die neue Stelle übergehen. Wir informieren dich vorab und du kannst dein Konto vor Wirksamwerden des Übergangs löschen.

## Internationale Datenübermittlungen

Einige unserer Dienstleister — darunter OpenAI, Stripe, Google und DeepL — verarbeiten Daten außerhalb des Europäischen Wirtschaftsraums. Soweit dies der Fall ist, stützen wir uns auf die Standardvertragsklauseln (SCC) der EU-Kommission sowie, für US-Übermittlungen, auf den EU-US Data Privacy Framework, um EU-Standards einzuhalten. Eine Kopie der Schutzmaßnahmen kannst du unter privacy@novaku.app anfordern.

## Speicherdauer

Wir bewahren verschiedene Datenkategorien unterschiedlich lange auf:

- **Kontoprofil** — solange dein Konto besteht. Nach der Löschung halten wir einen minimalen Datensatz (deine Display-ID und die Tatsache, dass ein Konto bestand) bis zu 30 Tage vor, um Anfragen abzuschließen, und löschen ihn dann endgültig.
- **Beiträge, Kommentare und Chat-Nachrichten** — solange dein Konto besteht. Beim Löschen eines Beitrags, Kommentars oder einer Chat-Nachricht entfernen wir sie sofort aus der App; Backups, die sie enthalten, werden binnen 30 Tagen überschrieben.
- **Empfehlungs-Events** (Impressionen, Verweildauer, Hilfreich-Markierungen, Saves, Verbergungen, Meldungen) — 180 Tage, dann automatische Löschung.
- **Autor-Trust-Score** — wird nächtlich aus einem 60-Tage-rollenden Ereignisfenster neu berechnet. Der aktuelle Wert bleibt bestehen, solange dein Konto besteht.
- **Buddy-Posts** — aktive Posts verschwinden bei Ablauf (Zeitfenster oder Rückreisedatum überschritten) aus dem Feed. Der Datenbankeintrag bleibt zur Sicherheitsprüfung und Empfehlungslogik erhalten, sofern du keine Löschung verlangst.
- **Zahlungsunterlagen** — Rechnungen und Steuerunterlagen werden für die nach deutschem und EU-Recht erforderliche Dauer aufbewahrt (derzeit 10 Jahre für umsatzsteuerrelevante Belege gemäß § 147 AO).
- **Diagnose-Logs und Absturzberichte** — bis zu 90 Tage.
- **Meldungen, die du oder andere einreichen** — solange der Vorgang offen ist und bis zu 12 Monate nach Erledigung.

Nach Ablauf gesetzlicher Aufbewahrungsfristen werden Daten durch geplante Aufträge automatisch gelöscht.

## Deine Rechte

Wenn du in der Europäischen Union, im Vereinigten Königreich oder in einer Jurisdiktion mit vergleichbaren Datenschutzgesetzen lebst, hast du folgende Rechte:

- **Auskunftsrecht** (Art. 15 DSGVO) — eine Kopie der über dich gespeicherten personenbezogenen Daten verlangen.
- **Recht auf Berichtigung** (Art. 16 DSGVO) — unrichtige oder unvollständige Daten berichtigen lassen.
- **Recht auf Löschung** (Art. 17 DSGVO) — Löschung deines Kontos und der zugehörigen Daten verlangen, mit einer 30-tägigen Karenzfrist, in der du den Vorgang abbrechen kannst.
- **Recht auf Einschränkung** (Art. 18 DSGVO) — Einschränkung der Verarbeitung verlangen, solange ein Streit ungeklärt ist.
- **Recht auf Datenübertragbarkeit** (Art. 20 DSGVO) — Erhalt deiner Daten in einem strukturierten, maschinenlesbaren JSON-Archiv.
- **Widerspruchsrecht** (Art. 21 DSGVO) — Widerspruch gegen die auf berechtigtem Interesse beruhende Verarbeitung, einschließlich der Personalisierung der Plaza-Empfehlungen.
- **Recht auf Widerruf der Einwilligung** — jederzeit, soweit wir uns auf deine Einwilligung gestützt haben.
- **Beschwerderecht** — Beschwerde bei deiner Datenschutzaufsichtsbehörde. In Berlin ist dies die Berliner Beauftragte für Datenschutz und Informationsfreiheit (BlnBDI, https://www.datenschutz-berlin.de). Auf Bundesebene die BfDI (https://www.bfdi.bund.de).

Auskunfts-, Übertragbarkeits-, Lösch-, Berichtigungs- und Einschränkungsrechte kannst du direkt in Postervia unter Einstellungen → Datenschutz → Daten ausüben. Wir antworten innerhalb von 30 Tagen gemäß Art. 12 Abs. 3 DSGVO.

## Kinder

Postervia richtet sich an Nutzer ab 16 Jahren. Wir erheben wissentlich keine Daten von Personen unter 16 Jahren. Wenn du unter 16 bist, registriere dich bitte nicht und nutze die App nicht.

Bei der Registrierung fragen wir dein Geburtsdatum ab. Erscheinst du unter 16 zu sein, legen wir kein Konto an. Erfahren wir später, dass ein registrierter Nutzer unter 16 ist, löschen wir das Konto und die zugehörigen Daten.

## Sicherheit

Wir schützen deine Daten mit branchenüblichen Maßnahmen: verschlüsselte Verbindungen (TLS) zwischen App und Servern, Verschlüsselung gespeicherter Medien, mit Argon2 gehashte Passwörter, kurzlebige Authentifizierungstoken im sicheren Gerätespeicher (Keychain bzw. KeyStore) sowie Zugriffsbeschränkungen für die Produktivumgebung. Kein System ist perfekt sicher, aber wir treffen angemessene technische und organisatorische Maßnahmen.

Erkennen wir eine Datenpanne mit erheblichem Risiko für deine Rechte, melden wir sie binnen 72 Stunden der zuständigen Aufsichtsbehörde und benachrichtigen, soweit erforderlich, betroffene Nutzer direkt.

## Cookies und ähnliche Technologien

Die Postervia-App verwendet keine Browser-Cookies. Wir nutzen jedoch wenige gerätebezogene Kennungen und Speichermechanismen:

- Eine vom Betriebssystem erzeugte Installations-ID zur Zustellung von Push-Benachrichtigungen.
- Sicheren lokalen Speicher (Keychain bzw. KeyStore) für deine Authentifizierungstoken.
- Lokalen App-Cache, um den Feed schneller zu laden und Bilder nicht doppelt herunterzuladen.

Du kannst die App-Daten jederzeit in den Geräteeinstellungen löschen. Damit wirst du abgemeldet.

## Änderungen dieser Erklärung

Wir können diese Erklärung aktualisieren, wenn wir Funktionen hinzufügen, sich Gesetze ändern oder Persterna eingetragen wird und der Verantwortliche wechselt. Dann werden wir:

- Das Datum „Stand" oben aktualisieren.
- Bei wesentlichen Änderungen in der App darauf hinweisen.
- Wo die DSGVO es vorschreibt, eine erneute Einwilligung einholen.

## Kontakt

Für datenschutzbezogene Fragen, Anliegen oder Beschwerden:

- E-Mail: privacy@novaku.app
- Postanschrift: siehe Impressum unter Einstellungen → Rechtliches → Impressum

Bei Routineanfragen antworten wir in der Regel binnen 7 Kalendertagen; bei formalen Betroffenenanträgen innerhalb der 30-tägigen DSGVO-Frist.
`;

// ─────────────────────────────────────────────────────────────────────────────
// TERMS OF USE — English
// ─────────────────────────────────────────────────────────────────────────────

const TERMS_OF_USE_EN = `## Acceptance of these Terms

These Terms of Use form a binding agreement between you and Yinchao Chen, an individual developer based in Berlin, Germany ("we", "us", or "our"), regarding your use of Postervia. By creating an account, signing in with Google or Apple, or otherwise using the app, you agree to these Terms and to our Privacy Policy.

If you do not agree, do not use Postervia.

**Note on the operator:** We are in the process of incorporating a German legal entity called Persterna. Until that registration is complete, the individual developer named above is the contracting party. When the company is registered, we will update these Terms to reflect the new entity and notify you in the app at least 30 days before the change takes effect; if you do not agree, you can delete your account.

## The service

Postervia is a mobile app that helps people who have recently moved or are traveling. It lets you:

- Browse local guides and community posts on Plaza.
- Build a personal task list ("Odyssey") of administrative and practical steps.
- Connect with other users through one-on-one and group chat.
- Publish "buddy posts" offering or requesting companionship for in-person errands, or offering to carry items between cities.
- Use AI-assisted features such as document interpretation (Scribe) and on-demand translation.

We may add, change, or remove features at our discretion. We will try to give you reasonable notice before removing features you actively use.

## Eligibility and account

You must be at least 16 years old to use Postervia. We do not knowingly create accounts for users under 16.

You agree to:

- Provide accurate registration information (email, date of birth, gender, city) and keep it current.
- Not impersonate another person or use a name you have no right to use.
- Keep your password and your device's secure storage safe. You are responsible for activity that occurs under your account.
- Tell us promptly if you believe someone has accessed your account without permission.

You can have only one account at a time, except where we explicitly allow multiple (for example, separate accounts for a personal and business identity, which is not currently supported).

## Your content

Postervia hosts content you create — posts, comments, photos, buddy posts, chat messages, documents you upload, and notes against your tasks. You keep all rights you have in your content. You do not transfer ownership to us.

To run the service, you grant us a worldwide, non-exclusive, royalty-free license to host, store, copy, display, distribute, translate, and create derived versions of your content, but only for the limited purposes of operating, improving, and promoting Postervia. The license ends when you delete the content or your account, except where we are legally required to keep it longer or where it has been shared with others who may still see it (for example, a comment quoted in another user's post).

You promise that the content you post:

- Is yours, or you have the right to post it.
- Does not infringe anyone's intellectual property, privacy, or other rights.
- Does not contain false information presented as fact about identifiable people.

We do not pre-review content before it is posted. We may, after the fact, remove content that violates these Terms, our Community Guidelines, or applicable law.

## Acceptable use

You agree not to:

- Use Postervia for any illegal activity, or to facilitate illegal activity offline (including human trafficking, smuggling, fraud, money laundering, illegal drug sales, or illegal weapons transfers).
- Post or send content that sexualizes minors, depicts terrorism, promotes self-harm, or constitutes hate speech against a protected group.
- Harass, stalk, threaten, or impersonate other users.
- Post spam, repetitive promotional content, or links to malware.
- Scrape, copy, or systematically download other users' content without their consent.
- Reverse-engineer, decompile, or attempt to extract source code from the app, except where applicable law explicitly allows it.
- Use automated tools (bots, scripts) to interact with the service in a way that imitates a human user, except for accessibility tools you use yourself.
- Probe, scan, or test the vulnerability of our systems without our written permission. (If you've found a vulnerability and want to report it responsibly, email security@novaku.app.)
- Circumvent rate limits, region restrictions, age gates, or content-moderation decisions.

We may suspend or terminate accounts that violate this section. For serious violations — illegal content, child safety risks, or coordinated platform abuse — we may act immediately without prior notice.

## Buddy posts and chats

Postervia lets users meet each other in real life through buddy posts. We do not employ, vet, or supervise buddies. We do not verify identities beyond what is needed to create an account. **You meet other Postervia users entirely at your own risk.**

When you post or respond to a buddy post:

- You are entering into a direct arrangement with the other user, not with us.
- We do not currently process payments between users. Any money changing hands does so off-platform and is the responsibility of the parties involved.
- You agree to behave lawfully and safely. Do not arrange to meet in private locations until you trust the other person. Tell someone where you are going.

We may add an escrow and identity-verification layer in the future. Until that ships, treat every buddy interaction as if you were meeting a stranger online.

Chat messages are visible to the participants of that chat. We may scan messages with automated tools to detect spam, illegal content, or coordinated abuse, but we do not read messages routinely for any other purpose.

## Subscriptions and billing

Some features are reserved for Postervia+ subscribers. Current Postervia+ benefits include the full task DAG (instead of the free tier's first 5 main nodes), unlimited AI Copilot conversations (instead of 5 per month), unlimited Scribe document uploads (instead of 1 per month), and reduced fees on the future Buddy marketplace.

Subscriptions are billed through Stripe. By starting a subscription you agree to:

- The price displayed in the app at checkout. We bill in the currency shown.
- Automatic renewal at the end of each billing period (monthly or yearly) unless you cancel beforehand.
- Receiving a payment receipt at the email on your account.

You can cancel a subscription at any time from Settings or directly through Stripe's customer portal; cancellation takes effect at the end of the current paid period and you keep Postervia+ access until then. We do not pro-rate refunds for partial periods, except where mandatory consumer-protection law requires us to. EU consumers have the statutory right to withdraw from a distance contract within 14 days; this right is waived as soon as you start using a Postervia+ benefit that you would not have without subscribing.

Free trials, when offered, require a valid payment method up front. You will not be charged during the trial. If you do not cancel before the trial ends, you will be charged for the first full period.

## Intellectual property

Postervia, the Postervia logo, the look and feel of the app, our trademarks, and any non-user-generated content (such as the editorial guides we publish ourselves) belong to the operator or to our licensors. You may not copy, modify, distribute, or use them without our written permission.

You may not use our trademarks in a way that suggests we endorse you or your business.

## Third-party services

Postervia integrates third-party services to provide features such as authentication, payments, AI processing, OCR, translation, and real-time search. Your use of those features is also subject to the third party's own terms (Google, Apple, Stripe, OpenAI, DeepL, Cloudflare, Perplexity, Tavily). We are not responsible for the third-party service's availability or for any data it processes outside our agreement with them.

## Termination

You may delete your account at any time from Settings → Privacy → Data → Delete account. Deletion is subject to a 30-day grace period during which you can cancel; after that, we hard-delete personal data as described in our Privacy Policy.

We may suspend or terminate your account if:

- You materially breach these Terms or our Community Guidelines.
- We are legally required to.
- Your account has been inactive for an extended period (we will email you before doing this).

If we terminate your account for breach, we are not obligated to refund subscription fees for the remainder of any paid period.

## Disclaimers

Postervia is provided "as is" and "as available". We do not warrant that the service will be uninterrupted, error-free, or perfectly secure. We do not warrant that the content shared by users is accurate, complete, or safe to rely on for serious decisions (immigration, legal, medical, or financial). Always check official sources before acting.

AI-generated content — including Scribe document summaries, AI Copilot replies, and machine translations — can be wrong. We mark AI output where we can. Treat it as a starting point, not a verified answer.

Source links and last-verified timestamps on tasks and guides indicate when a contributor last confirmed the information; they do not guarantee that the underlying official rules haven't changed since.

## Limitation of liability

To the extent permitted by law, the operator's total liability to you for any claim arising out of or related to Postervia is limited to the greater of (a) the amount you paid us in the 12 months before the claim arose, and (b) one hundred euros (€100). We are not liable for indirect, incidental, consequential, or punitive damages, or for lost data, lost profits, or business interruption, even if we were advised of the possibility.

Nothing in these Terms limits liability that cannot be limited under applicable law (for example, liability for death or personal injury caused by negligence, or for our intentional misconduct, in jurisdictions where such limits would be void).

## Indemnification

If a third party brings a claim against us because of how you used Postervia or because of content you posted, you agree to defend us against the claim and to pay reasonable costs and damages awarded. We will tell you about the claim promptly and let you control the defense where the law allows.

## Governing law and disputes

These Terms are governed by the laws of the Federal Republic of Germany, excluding its conflict-of-law rules and excluding the UN Convention on Contracts for the International Sale of Goods.

If you are a consumer ordinarily resident in another EU member state, mandatory consumer-protection rules of that state still apply.

We try to resolve disputes informally first. Email legal@novaku.app and we will respond within 14 days. If we cannot resolve the dispute that way, you may bring a claim in a court of competent jurisdiction. EU consumers may also use the European Commission's Online Dispute Resolution platform at ec.europa.eu/consumers/odr. We are not currently obliged to participate in arbitration before a consumer arbitration board.

## Changes to these Terms

We may update these Terms. When we make material changes, we will:

- Update the "Last updated" date at the top.
- Tell you inside the app at least 30 days before the change takes effect.
- For changes that require it, ask for your fresh acceptance.

If you keep using Postervia after the effective date, you accept the updated Terms. If you do not, you can delete your account.

## Contact

For questions about these Terms:

- Email: legal@novaku.app
- Postal address: see the Impressum at Settings → Legal → Imprint
`;

// ─────────────────────────────────────────────────────────────────────────────
// TERMS OF USE — German (Nutzungsbedingungen)
// ─────────────────────────────────────────────────────────────────────────────
// Same content as TERMS_OF_USE_EN, adapted to German legal vocabulary
// (Nutzungsbedingungen, Vertragspartner, fernabsatzrechtliches Widerrufsrecht).
// Should be reviewed by a German lawyer before any wider release.

const TERMS_OF_USE_DE = `## Annahme dieser Bedingungen

Diese Nutzungsbedingungen bilden eine verbindliche Vereinbarung zwischen dir und Yinchao Chen, einem in Berlin ansässigen Einzelentwickler („wir", „uns" bzw. „unser"), über deine Nutzung von Postervia. Mit Anlegen eines Kontos, Anmeldung über Google oder Apple oder sonstiger Nutzung der App stimmst du diesen Bedingungen und unserer Datenschutzerklärung zu.

Wenn du nicht zustimmst, nutze Postervia nicht.

**Hinweis zum Betreiber:** Wir bereiten derzeit die Gründung einer deutschen Gesellschaft namens Persterna vor. Bis zur Eintragung ist der oben genannte Einzelentwickler der Vertragspartner. Sobald die Gesellschaft eingetragen ist, aktualisieren wir diese Bedingungen entsprechend und weisen dich in der App mindestens 30 Tage vor Wirksamwerden darauf hin; bei Nichtzustimmung kannst du dein Konto löschen.

## Der Dienst

Postervia ist eine mobile App für Menschen, die kürzlich umgezogen sind oder unterwegs sind. Du kannst damit:

- Lokale Anleitungen und Community-Beiträge auf Plaza durchsuchen.
- Eine persönliche Aufgabenliste („Odyssey") mit administrativen und praktischen Schritten aufbauen.
- Über Einzel- und Gruppenchats mit anderen Nutzern in Kontakt treten.
- „Buddy-Posts" veröffentlichen, in denen du Begleitung für Erledigungen anbietest oder suchst, oder anbietest, Gegenstände zwischen Städten mitzubringen.
- KI-gestützte Funktionen wie Dokumenten-Auswertung (Scribe) und bedarfsweise Übersetzung nutzen.

Wir können Funktionen nach eigenem Ermessen hinzufügen, ändern oder entfernen. Funktionen, die du aktiv nutzt, entfernen wir nach Möglichkeit mit angemessener Vorankündigung.

## Voraussetzungen und Konto

Du musst mindestens 16 Jahre alt sein, um Postervia zu nutzen. Wir legen wissentlich keine Konten für Personen unter 16 Jahren an.

Du verpflichtest dich:

- Korrekte Registrierungsdaten (E-Mail, Geburtsdatum, Geschlecht, Stadt) anzugeben und aktuell zu halten.
- Keine andere Person zu imitieren und keinen Namen zu verwenden, auf den du kein Recht hast.
- Dein Passwort und den sicheren Gerätespeicher zu schützen. Für Aktivitäten unter deinem Konto bist du verantwortlich.
- Uns unverzüglich zu informieren, falls du den Verdacht hast, dass jemand unbefugt auf dein Konto zugegriffen hat.

Du darfst grundsätzlich nur ein Konto gleichzeitig führen, sofern wir nicht ausdrücklich mehrere zulassen (z. B. getrennte private und geschäftliche Konten, was derzeit nicht unterstützt wird).

## Deine Inhalte

Postervia speichert von dir erstellte Inhalte — Beiträge, Kommentare, Fotos, Buddy-Posts, Chat-Nachrichten, hochgeladene Dokumente und Notizen zu deinen Aufgaben. Du behältst alle Rechte an deinen Inhalten. Es findet keine Eigentumsübertragung an uns statt.

Zur Bereitstellung des Dienstes räumst du uns ein weltweites, nicht-ausschließliches, unentgeltliches Recht ein, deine Inhalte zu hosten, zu speichern, zu kopieren, anzuzeigen, zu verbreiten, zu übersetzen und abgeleitete Versionen zu erstellen, jedoch ausschließlich für die Zwecke des Betriebs, der Verbesserung und der Bewerbung von Postervia. Die Lizenz endet, wenn du den Inhalt oder dein Konto löschst — außer wenn eine gesetzliche Aufbewahrungspflicht besteht oder der Inhalt anderweitig geteilt wurde und für andere sichtbar bleibt (z. B. ein zitierter Kommentar in einem anderen Beitrag).

Du versicherst, dass deine veröffentlichten Inhalte:

- Dir gehören oder du das Recht zur Veröffentlichung hast.
- Keine Urheber-, Persönlichkeits- oder sonstigen Rechte Dritter verletzen.
- Keine falschen Tatsachenbehauptungen über identifizierbare Personen enthalten.

Wir prüfen Inhalte nicht vor Veröffentlichung. Wir können Inhalte nachträglich entfernen, die gegen diese Bedingungen, unsere Community-Richtlinien oder geltendes Recht verstoßen.

## Zulässige Nutzung

Du verpflichtest dich, Folgendes zu unterlassen:

- Nutzung von Postervia für illegale Aktivitäten oder zur Erleichterung offline-illegaler Handlungen (einschließlich Menschenhandel, Schmuggel, Betrug, Geldwäsche, illegaler Drogen- oder Waffenhandel).
- Veröffentlichen oder Versenden von Inhalten, die Minderjährige sexualisieren, Terrorismus darstellen, Selbstverletzung fördern oder Hassrede gegen geschützte Gruppen darstellen.
- Belästigung, Stalking, Bedrohung oder Imitation anderer Nutzer.
- Spam, repetitive Werbung oder Links zu Schadsoftware.
- Scraping, Kopieren oder systematisches Herunterladen fremder Inhalte ohne deren Zustimmung.
- Reverse Engineering, Dekompilieren oder Extraktion des Quellcodes der App, soweit nicht gesetzlich ausdrücklich erlaubt.
- Einsatz automatisierter Werkzeuge (Bots, Skripte), die menschliche Nutzer imitieren — ausgenommen Hilfstechnologien, die du selbst verwendest.
- Sondieren, Scannen oder Testen der Verwundbarkeit unserer Systeme ohne unsere schriftliche Erlaubnis. (Falls du eine Sicherheitslücke verantwortungsvoll melden möchtest, schreibe an security@novaku.app.)
- Umgehung von Rate-Limits, Regionseinschränkungen, Altersprüfungen oder Moderationsentscheidungen.

Wir können Konten sperren oder kündigen, die gegen diesen Abschnitt verstoßen. Bei schweren Verstößen — illegale Inhalte, Risiken für Minderjährige oder koordinierter Plattform-Missbrauch — können wir ohne Vorankündigung sofort handeln.

## Buddy-Posts und Chats

Postervia ermöglicht Nutzern, sich über Buddy-Posts real zu treffen. Wir beschäftigen, prüfen und beaufsichtigen keine Buddies. Wir verifizieren Identitäten nicht über das hinaus, was zur Kontoerstellung nötig ist. **Du triffst andere Postervia-Nutzer ausschließlich auf eigene Verantwortung.**

Wenn du einen Buddy-Post veröffentlichst oder beantwortest:

- Du schließt eine direkte Vereinbarung mit dem anderen Nutzer, nicht mit uns.
- Wir wickeln derzeit keine Zahlungen zwischen Nutzern ab. Etwaige Geldflüsse erfolgen außerhalb der Plattform und liegen in der Verantwortung der Beteiligten.
- Du verhältst dich rechtmäßig und sicher. Verabrede keine Treffen an privaten Orten, bevor du der anderen Person vertraust. Informiere jemanden über deinen Aufenthaltsort.

In Zukunft könnte eine Treuhand- und Identitätsprüfungsebene hinzukommen. Bis dahin behandle jede Buddy-Interaktion wie eine Begegnung mit einer fremden Person aus dem Internet.

Chat-Nachrichten sind für die Chat-Teilnehmer sichtbar. Wir können Nachrichten mit automatisierten Werkzeugen auf Spam, illegale Inhalte oder koordinierten Missbrauch prüfen, lesen sie aber nicht routinemäßig zu anderen Zwecken.

## Abonnements und Zahlungen

Einige Funktionen sind Postervia+-Abonnenten vorbehalten. Aktuelle Postervia+-Vorteile umfassen den vollständigen Task-DAG (statt der ersten 5 Hauptknoten der Gratisstufe), unbegrenzte AI-Copilot-Gespräche (statt 5 pro Monat), unbegrenzte Scribe-Dokument-Uploads (statt 1 pro Monat) und reduzierte Gebühren auf dem künftigen Buddy-Marktplatz.

Abonnements werden über Stripe abgerechnet. Mit Abschluss eines Abonnements erklärst du dich einverstanden mit:

- Dem im Checkout angezeigten Preis. Die Abrechnung erfolgt in der angezeigten Währung.
- Automatischer Verlängerung am Ende jedes Abrechnungszeitraums (monatlich oder jährlich), sofern du nicht vorher kündigst.
- Zustellung einer Zahlungsbestätigung an die im Konto hinterlegte E-Mail-Adresse.

Du kannst ein Abonnement jederzeit in den Einstellungen oder direkt über das Stripe-Kundenportal kündigen; die Kündigung wird zum Ende des aktuell bezahlten Zeitraums wirksam und Postervia+ bleibt bis dahin nutzbar. Anteilige Erstattungen für angebrochene Zeiträume gewähren wir nur, soweit zwingendes Verbraucherrecht dies verlangt. EU-Verbrauchern steht das gesetzliche Widerrufsrecht im Fernabsatz von 14 Tagen zu; dieses Recht erlischt, sobald du eine Postervia+-Leistung nutzt, die ohne Abonnement nicht verfügbar wäre.

Kostenlose Testphasen erfordern eine gültige Zahlungsmethode im Voraus. Während der Testphase wird nichts berechnet. Wenn du nicht vor Ende der Testphase kündigst, wird der erste vollständige Zeitraum belastet.

## Geistiges Eigentum

Postervia, das Postervia-Logo, das Look-and-Feel der App, unsere Marken sowie alle nicht von Nutzern erstellten Inhalte (z. B. redaktionelle Anleitungen, die wir selbst veröffentlichen) stehen im Eigentum des Betreibers oder unserer Lizenzgeber. Ohne unsere schriftliche Zustimmung dürfen sie nicht kopiert, geändert, verbreitet oder verwendet werden.

Du darfst unsere Marken nicht in einer Weise verwenden, die nahelegt, wir würden dich oder dein Geschäft unterstützen.

## Drittanbieter-Dienste

Postervia integriert Drittanbieter-Dienste für Funktionen wie Authentifizierung, Zahlungen, KI-Verarbeitung, OCR, Übersetzung und Echtzeitsuche. Deine Nutzung dieser Funktionen unterliegt zusätzlich den Bedingungen des jeweiligen Anbieters (Google, Apple, Stripe, OpenAI, DeepL, Cloudflare, Perplexity, Tavily). Für deren Verfügbarkeit oder die Verarbeitung außerhalb unserer Verträge mit ihnen sind wir nicht verantwortlich.

## Kündigung

Du kannst dein Konto jederzeit unter Einstellungen → Datenschutz → Daten → Konto löschen entfernen. Es gilt eine 30-tägige Karenzfrist, in der du den Vorgang abbrechen kannst; danach löschen wir personenbezogene Daten gemäß unserer Datenschutzerklärung endgültig.

Wir können dein Konto sperren oder kündigen, wenn:

- Du diese Bedingungen oder unsere Community-Richtlinien erheblich verletzt.
- Wir gesetzlich dazu verpflichtet sind.
- Dein Konto über einen längeren Zeitraum inaktiv ist (in diesem Fall benachrichtigen wir dich vorher per E-Mail).

Bei Kündigung wegen Vertragsverletzung sind wir nicht verpflichtet, Abonnementgebühren für den verbleibenden Zeitraum zu erstatten.

## Haftungsausschluss

Postervia wird „wie besehen" und „wie verfügbar" bereitgestellt. Wir garantieren weder, dass der Dienst unterbrechungsfrei, fehlerfrei oder absolut sicher ist, noch dass von Nutzern geteilte Inhalte zutreffend, vollständig oder geeignet sind, um darauf wichtige Entscheidungen (etwa Einwanderungs-, Rechts-, Gesundheits- oder Finanzentscheidungen) zu stützen. Prüfe vor entsprechenden Schritten stets offizielle Quellen.

KI-generierte Inhalte — einschließlich Scribe-Dokumenten-Zusammenfassungen, AI-Copilot-Antworten und maschineller Übersetzungen — können falsch sein. Wir kennzeichnen KI-Ausgaben, wo möglich. Behandle sie als Ausgangspunkt, nicht als verifizierte Antwort.

Quell-Links und „Zuletzt geprüft"-Zeitstempel auf Aufgaben und Anleitungen zeigen, wann ein Beitragender die Information zuletzt bestätigt hat; sie garantieren nicht, dass sich die offiziellen Regeln seither nicht geändert haben.

## Haftungsbeschränkung

Soweit gesetzlich zulässig, ist die Gesamthaftung des Betreibers dir gegenüber für Ansprüche im Zusammenhang mit Postervia auf den höheren der folgenden Beträge begrenzt: (a) den Betrag, den du in den 12 Monaten vor Entstehung des Anspruchs an uns gezahlt hast, oder (b) einhundert Euro (€100). Wir haften nicht für indirekte, Folge-, Begleit- oder Strafschäden, Datenverlust, entgangenen Gewinn oder Betriebsunterbrechung, auch wenn wir auf die Möglichkeit hingewiesen wurden.

Diese Bedingungen schließen keine Haftung aus, die gesetzlich nicht beschränkbar ist (z. B. Haftung für Verletzung von Leben, Körper oder Gesundheit infolge Fahrlässigkeit, oder für vorsätzliches Fehlverhalten, in Jurisdiktionen, in denen solche Beschränkungen unzulässig wären).

## Freistellung

Wird ein Dritter aufgrund deiner Nutzung von Postervia oder deiner veröffentlichten Inhalte gegen uns Anspruch erheben, verpflichtest du dich, uns gegen den Anspruch zu verteidigen sowie angemessene Kosten und zugesprochene Schäden zu tragen. Wir informieren dich unverzüglich über den Anspruch und überlassen dir, soweit gesetzlich zulässig, die Verteidigung.

## Anwendbares Recht und Streitbeilegung

Auf diese Bedingungen findet das Recht der Bundesrepublik Deutschland Anwendung, unter Ausschluss seiner Kollisionsnormen und des UN-Kaufrechts.

Bist du Verbraucher mit gewöhnlichem Aufenthalt in einem anderen EU-Mitgliedstaat, bleiben zwingende verbraucherschutzrechtliche Bestimmungen dieses Staates anwendbar.

Wir versuchen zunächst eine außergerichtliche Einigung. Schreibe an legal@novaku.app; wir antworten innerhalb von 14 Tagen. Lässt sich der Streit so nicht beilegen, kannst du den zuständigen Gerichtsweg beschreiten. EU-Verbraucher können zudem die Online-Streitbeilegungs-Plattform der Europäischen Kommission unter ec.europa.eu/consumers/odr nutzen. Wir sind derzeit nicht verpflichtet, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.

## Änderungen dieser Bedingungen

Wir können diese Bedingungen aktualisieren. Bei wesentlichen Änderungen werden wir:

- Das Datum „Stand" oben aktualisieren.
- Dich in der App mindestens 30 Tage vor Wirksamwerden benachrichtigen.
- Wenn nötig, eine erneute Zustimmung einholen.

Nutzt du Postervia nach dem Wirksamkeitsdatum weiter, akzeptierst du die aktualisierten Bedingungen. Andernfalls kannst du dein Konto löschen.

## Kontakt

Bei Fragen zu diesen Bedingungen:

- E-Mail: legal@novaku.app
- Postanschrift: siehe Impressum unter Einstellungen → Rechtliches → Impressum
`;

// ─────────────────────────────────────────────────────────────────────────────
// IMPRESSUM — English (informational; the German version is the legally
// authoritative one under § 5 TMG)
// ─────────────────────────────────────────────────────────────────────────────

const IMPRESSUM_EN = `## Information pursuant to § 5 TMG (German Telemedia Act)

Yinchao Chen
Bansiner Straße 29
12619 Berlin
Germany

## Contact

Phone: +49 1525 2827691
Email: legal@novaku.app

## Responsible for content per § 18 (2) MStV

Yinchao Chen (address as above)

## VAT identification number

No VAT identification number pursuant to § 27a UStG has been issued at this time.

## Profession

Self-employed software developer (sole proprietor / Einzelunternehmer based in Berlin).

## Business registration

Postervia is currently operated by an individual. The incorporation of a German limited-liability company ("Persterna") is in preparation. No entry in the commercial register exists at the present time. Once Persterna is registered, this Imprint will be updated to reflect the new entity.

## Online dispute resolution

The European Commission provides an online dispute resolution platform: https://ec.europa.eu/consumers/odr

Our email address is listed above. We are not obliged and not willing to participate in dispute resolution proceedings before a consumer arbitration board.

## Liability for content

As a service provider, we are responsible for our own content on this app under § 7 (1) TMG in accordance with general law. However, under §§ 8 to 10 TMG, as a service provider we are not obligated to monitor third-party information transmitted or stored on our platform, or to investigate circumstances that suggest illegal activity.

Obligations to remove or block the use of information under general law remain unaffected. However, liability in this regard is only possible from the moment we become aware of a specific legal violation. Upon becoming aware of such violations, we will remove the content immediately.

## Liability for links

Our app contains links to external third-party websites whose content we cannot influence. Therefore, we cannot accept liability for such third-party content. The respective provider or operator of the linked pages is always responsible for that content.

The linked pages were checked for possible legal violations at the time of linking. Illegal content was not recognizable at the time of linking. However, permanent monitoring of the content of linked pages is not reasonable without concrete indications of a legal violation. Upon becoming aware of legal violations, we will remove such links immediately.

## Copyright

The content and works on this app created by the operator are subject to German copyright law. Reproduction, processing, distribution, and any kind of exploitation outside the limits of copyright require the written consent of the respective author or creator.

Where the content on this app was not created by the operator, third-party copyrights are respected.
`;

// ─────────────────────────────────────────────────────────────────────────────
// IMPRESSUM — German (legally authoritative version)
// ─────────────────────────────────────────────────────────────────────────────

const IMPRESSUM_DE = `## Angaben gemäß § 5 TMG

Yinchao Chen
Bansiner Straße 29
12619 Berlin
Deutschland

## Kontakt

Telefon: +49 1525 2827691
E-Mail: legal@novaku.app

## Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV

Yinchao Chen (Anschrift wie oben)

## Umsatzsteuer-Identifikationsnummer

Eine Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG liegt derzeit nicht vor.

## Berufsbezeichnung

Selbstständiger Software-Entwickler (Einzelunternehmer mit Sitz in Berlin).

## Gewerbliche Eintragung

Postervia wird derzeit von einer Einzelperson betrieben. Die Eintragung einer Gesellschaft mit beschränkter Haftung („Persterna") befindet sich in Vorbereitung. Eine Eintragung im Handelsregister besteht zum aktuellen Zeitpunkt nicht. Sobald Persterna eingetragen ist, wird dieses Impressum entsprechend aktualisiert.

## Streitschlichtung

Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr

Unsere E-Mail-Adresse findest du oben. Zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle sind wir nicht verpflichtet und nicht bereit.

## Haftung für Inhalte

Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte in dieser App nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.

Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.

## Haftung für Links

Unsere App enthält Verweise auf externe Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.

Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.

## Urheberrecht

Die durch den Betreiber erstellten Inhalte und Werke in dieser App unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.

Soweit die Inhalte in dieser App nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet.
`;

// ─────────────────────────────────────────────────────────────────────────────
// Language map + getter helpers
// ─────────────────────────────────────────────────────────────────────────────

const PRIVACY_POLICY_BY_LANG: Record<string, string> = {
  en: PRIVACY_POLICY_EN,
  de: PRIVACY_POLICY_DE,
};

const TERMS_OF_USE_BY_LANG: Record<string, string> = {
  en: TERMS_OF_USE_EN,
  de: TERMS_OF_USE_DE,
};

const IMPRESSUM_BY_LANG: Record<string, string> = {
  en: IMPRESSUM_EN,
  de: IMPRESSUM_DE,
};

// Per-language label for the "Last updated" line. Other locales fall through
// to the English version of the body, so they reuse the English label too.
const LAST_UPDATED_LABEL_BY_LANG: Record<string, string> = {
  en: `Last updated: ${LEGAL_LAST_UPDATED}`,
  de: 'Stand: 11. Mai 2026',
};

// Languages other than 'de' fall back to English. Once a translator-reviewed
// version of zh, fr, es, etc. lands, add it to the maps above.
export function getPrivacyPolicy(langCode: string): string {
  return PRIVACY_POLICY_BY_LANG[langCode] ?? PRIVACY_POLICY_BY_LANG.en;
}

export function getTermsOfUse(langCode: string): string {
  return TERMS_OF_USE_BY_LANG[langCode] ?? TERMS_OF_USE_BY_LANG.en;
}

export function getImpressum(langCode: string): string {
  return IMPRESSUM_BY_LANG[langCode] ?? IMPRESSUM_BY_LANG.en;
}

export function getLastUpdatedLabel(langCode: string): string {
  return LAST_UPDATED_LABEL_BY_LANG[langCode] ?? LAST_UPDATED_LABEL_BY_LANG.en;
}
