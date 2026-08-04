<div align="center">

# Météo Express Pro

**Tableau de bord météo moderne, riche en fonctionnalités et assisté par IA**

Application météo complète avec recommandations intelligentes propulsées par Groq LLM, un chatbot conversationnel, une authentification utilisateur avec profils personnalisés, et une interface bilingue français / anglais.
Construite avec Flask, Jinja2 et JavaScript vanilla.

[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/docs/Web/CSS)
[![Jinja](https://img.shields.io/badge/Jinja-B41717?style=for-the-badge&logo=jinja&logoColor=white)](https://jinja.palletsprojects.com/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Groq](https://img.shields.io/badge/Groq-F55036?style=for-the-badge&logo=groq&logoColor=white)](https://groq.com/)
[![OpenWeatherMap](https://img.shields.io/badge/OpenWeatherMap-EB6E4B?style=for-the-badge)](https://openweathermap.org/)
[![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

**Développé par Cheick Yacouba Soukouna**

</div>

---

## Table des matières

- [Aperçu du projet](#aperçu-du-projet)
- [Fonctionnalités](#fonctionnalités)
- [Captures d'écran](#captures-décran)
- [Clés API](#clés-api)
- [Installation](#installation)
- [Tests](#tests)
- [Structure du projet](#structure-du-projet)
- [Routes principales](#routes-principales)
- [Stack technique](#stack-technique)
- [Notes importantes](#notes-importantes)
- [Base de données](#base-de-données)
- [Crédits](#crédits)
- [Remerciements](#remerciements)

---

## Aperçu du projet

Météo Express Pro est une application web météo complète, pensée pour aller bien au-delà des données météorologiques classiques. Elle combine intelligence artificielle, personnalisation par profil utilisateur, visualisations interactives et support hors ligne pour offrir un tableau de bord météo moderne et agréable à utiliser, disponible en français et en anglais.

---

## Fonctionnalités

### Météo principale

- Conditions actuelles détaillées (température ressentie, humidité, vent, pression, visibilité, lever/coucher du soleil, couverture nuageuse)
- Graphiques interactifs 24h (température, humidité, vent) avec infobulle au survol
- Prévisions à 5 jours avec agrégation intelligente
- Qualité de l'air (AQI) avec détails PM2.5 / PM10 / NO₂ / O₃
- Indice UV avec niveaux de risque et conseils associés
- Carte interactive (Leaflet) avec couches météo OpenWeatherMap (précipitations, nuages, vent, température)
- Conversion °C / °F

### IA et recommandations intelligentes

- Groq LLM (LLaMA 3.3 70B) pour des recommandations naturelles en streaming SSE
- Suggestions vestimentaires selon la météo
- Idées d'activités adaptées au moment de la journée
- Alertes santé (chaleur, froid, vent, humidité)
- Conseils voyage et conduite
- Indice de confort personnel (température + humidité)
- Meilleur jour de la semaine pour 4 activités (course, pique-nique, conduite, plage)
- Planificateur d'activité interactif
- Conseils avancés : meilleures heures, équipement à emporter, sécurité
- Fallback automatique vers le moteur WeatherAI basé sur des règles si Groq est indisponible
- Backoff automatique de 5 minutes en cas de quota dépassé

### Recommandations personnalisées selon le profil

- Adaptation des conseils selon l'âge, la profession, les allergies et les conditions chroniques
- Suggestions d'activités et de tenues adaptées au profil de l'utilisateur
- Avertissements pollen/allergènes contextualisés
- Champs entièrement optionnels — l'application reste utilisable sans connexion

### Authentification et gestion des profils

- Inscription / connexion / déconnexion par email
- Sessions sécurisées via tokens signés (itsdangerous)
- Protection CSRF sur tous les formulaires
- Profil utilisateur : âge, profession (agriculteur, extérieur, athlète, bureau), allergies, conditions chroniques
- Page d'onboarding après inscription
- Persistance via base de données SQLite

### Chatbot météo

- Assistant conversationnel en temps réel avec contexte météo automatique
- Détection automatique de la ville consultée
- Réponses avec effet machine à écrire
- Animations fluides et design glassmorphism
- Bouton flottant avec indicateur visuel

### Expérience utilisateur et fonctionnalités avancées

- Page d'accueil dynamique : aperçu météo automatique (géolocalisation ou dernière ville visitée), vitrine des fonctionnalités
- Recherche de ville avec autocomplétion intelligente (dataset local de ~170k villes, fallback API)
- Recherche vocale (transcription via Groq Whisper, FR/EN)
- Géolocalisation automatique (« Ma position » avec reverse geocoding)
- Page de comparaison de villes (côte à côte)
- Favoris et recherches récentes (localStorage)
- Mode sombre
- Fonds d'écran dynamiques réactifs à la météo (dégradés ciel + particules canvas)
- Animations météo canvas (pluie, neige, orage, brouillard, vent)
- Planificateur d'activités interactif avec scoring intelligent
- Modales explicatives (température ressentie, AQI, UV, confort)
- Partage en image (html2canvas — PNG)
- Export d'un rapport imprimable (HTML print-friendly)
- Interface bilingue FR/EN (localisation complète)
- Navigation rapide par sections (pills avec scroll fluide)

### Visualisations et interactions

- Boussole des vents SVG avec direction et vitesse
- Arc solaire SVG montrant la position du soleil en temps réel
- Phase de la lune calculée mathématiquement (sans API)
- Horloge locale de la ville consultée (fuseau horaire)
- Notifications toast
- Effet ripple sur les boutons
- Transitions CSS fluides et design glassmorphism

### Performance et sécurité

- Cache mémoire global : 10 min pour les données météo, 30 min pour les tuiles cartographiques
- Requêtes API parallélisées via ThreadPoolExecutor
- Chargement progressif : météo affichée immédiatement, recommandations IA streamées en arrière-plan (SSE)
- Proxy de tuiles cartographiques : la clé API ne quitte jamais le serveur
- Fallback PNG transparent pour les tuiles défaillantes (la carte reste intacte)
- Cache LRU pour les tuiles (80 entrées maximum)
- Redaction automatique des clés API dans les logs

### PWA et fonctionnement hors ligne

- Installable sur mobile et desktop (manifest.json + service worker)
- Fonctionne hors ligne pour les dernières villes consultées, via une stratégie cache first
- Icônes maskable 192×512 et thème couleur personnalisé

---

## Captures d'écran

> Une fois l'application lancée, ouvrez [http://localhost:5000](http://localhost:5000) pour l'explorer.

---

## Clés API

### OpenWeatherMap

*Obligatoire*

1. Créer un compte sur [openweathermap.org](https://openweathermap.org/api)
2. Générer une clé API

> ⚠️ L'endpoint One Call 3.0 est payant. L'application utilise l'API gratuite (weather + forecast + air_pollution). L'indice UV utilise une valeur par défaut si One Call est indisponible — aucun blocage.

### Groq

*Optionnel, recommandé*

1. Créer un compte sur [console.groq.com](https://console.groq.com)
2. Générer une clé API

Ajouter dans `.env` :

```env
OPENWEATHER_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
AUTH_SECRET_KEY=change-me-in-production
```

> Sans la clé Groq, l'application utilise automatiquement le moteur WeatherAI basé sur des règles.
> Sans `AUTH_SECRET_KEY`, une valeur par défaut est utilisée (à changer impérativement en production).

---

## Installation

### Prérequis

- Python 3.10+
- Git

### Étapes

```bash
git clone https://github.com/your-username/meteoexpress.git
cd meteoexpress
python -m venv .venv
source .venv/bin/activate        # Linux/macOS
# .venv\Scripts\Activate.ps1     # Windows
pip install -r requirements.txt
```

### Configuration

Créer un fichier `.env` à la racine du projet :

```env
OPENWEATHER_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
AUTH_SECRET_KEY=votre-clé-secrète-ici
```

> ⚠️ Ne jamais commiter le fichier `.env`.

### Démarrage

```bash
python run.py
```

Accès : [http://localhost:5000](http://localhost:5000)

### Déploiement en production

```bash
gunicorn wsgi:app -w 4 -b 0.0.0.0:5000
```

---

## Tests

```bash
pytest tests/ -v
```

Les tests couvrent : règles vestimentaires, activités, alertes santé, indice de confort, conseils voyage, meilleur jour, AQI, UV et prévisions.

---

## Structure du projet

```
meteoexpress/
├── run.py                          # Point d'entrée développement
├── wsgi.py                         # Point d'entrée production (gunicorn)
├── requirements.txt                # Dépendances Python
├── .flaskenv                       # Configuration Flask
├── .env                            # Clés API (non versionné)
├── README.md
├── bin/
│   └── build_cities.py             # Téléchargement et conversion du dataset GeoNames
├── backend/
│   ├── __init__.py
│   ├── app.py                      # Factory Flask (create_app)
│   ├── config.py                   # Configuration centralisée
│   ├── icon_map.py                 # Système d'icônes centralisé (Jinja filters)
│   ├── data/
│   │   ├── cities.json             # ~170k villes pour autocomplétion locale
│   │   └── cities1000.txt          # Source GeoNames (optionnel, pour rebuild)
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── models.py               # Modèles User + UserProfile (SQLite)
│   │   ├── session.py              # Sessions signées (itsdangerous)
│   │   └── csrf.py                 # Protection CSRF
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── weather.py              # Routes météo (blueprint)
│   │   └── auth.py                 # Routes authentification (blueprint)
│   ├── services/
│   │   ├── __init__.py
│   │   ├── weather_service.py      # Parsing météo, cache, helpers
│   │   ├── ai_engine.py            # Moteur Groq + WeatherAI (règles)
│   │   └── city_search.py          # Recherche locale de villes (prefix search)
│   ├── static/
│   │   ├── manifest.json           # PWA manifest
│   │   ├── sw.js                   # Service Worker (offline)
│   │   ├── css/main.css            # Styles complets (glassmorphism, animations)
│   │   ├── js/
│   │   │   ├── init.js             # Point d'entrée JS (modules)
│   │   │   ├── globals.js          # État global partagé
│   │   │   ├── icon-map.js         # Mappage d'icônes côté client
│   │   │   ├── i18n.js             # Internationalisation FR/EN
│   │   │   ├── theme.js            # Thème sombre permanent
│   │   │   ├── ui.js               # Favoris, recents, planner, partage
│   │   │   ├── search.js           # Autocomplétion, voix, géolocalisation
│   │   │   ├── charts.js           # Graphiques Canvas 24h
│   │   │   ├── map.js              # Carte Leaflet
│   │   │   ├── animations.js       # Particules météo canvas
│   │   │   ├── landing.js          # Page d'accueil dynamique
│   │   │   ├── local-clock.js      # Horloge locale fuseau horaire
│   │   │   ├── chatbot.js          # Chatbot météo
│   │   │   ├── quick-nav.js        # Navigation rapide par sections
│   │   │   ├── pwa.js              # Installation PWA
│   │   │   └── utils.js            # Fonctions utilitaires
│   │   ├── vendor/
│   │   │   ├── leaflet/            # Bibliothèque cartographique (self-hosted)
│   │   │   ├── tabler/             # Tabler Icons (self-hosted)
│   │   │   ├── flag-icons/         # Drapeaux pays (self-hosted)
│   │   │   └── html2canvas/        # Capture d'écran (self-hosted)
│   │   └── icons/
│   │       └── meteocons/          # 33 icônes météo SVG
│   └── templates/
│       ├── index.html              # Dashboard principal + Landing page
│       ├── compare.html            # Comparaison de villes
│       ├── report.html             # Rapport imprimable
│       └── auth/
│           ├── login.html          # Connexion
│           ├── signup.html         # Inscription
│           ├── onboarding.html     # Profil post-inscription
│           └── profile.html        # Gestion du profil
├── instance/
│   └── meteoexpress.db             # Base SQLite (créée automatiquement)
└── tests/
    ├── conftest.py                 # Fixtures pytest (app Flask)
    ├── __init__.py
    └── test_weather.py             # Tests unitaires
```

---

## Routes principales

| Route | Méthode | Description |
|-------|---------|-------------|
| `/` | GET | Dashboard météo (ou landing page si aucune ville) |
| `/compare` | GET | Comparaison de deux villes |
| `/export-pdf` | GET | Rapport imprimable (HTML) |
| `/signup` | GET/POST | Inscription utilisateur |
| `/login` | GET/POST | Connexion utilisateur |
| `/logout` | GET | Déconnexion |
| `/onboarding` | GET/POST | Configuration initiale du profil |
| `/profile` | GET/POST | Gestion du profil utilisateur |
| `/api/weather` | GET | API JSON météo complète |
| `/api/ai-recommendation` | GET | Recommandations IA (SSE streaming) |
| `/api/chat` | POST | Chatbot météo (conversationnel) |
| `/api/health` | GET | Health check |
| `/api/autocomplete` | GET | API autocomplétion |
| `/api/reverse-geocode` | GET | Géocodage inverse (lat/lon → ville) |
| `/map-tiles/*` | GET | Proxy sécurisé des tuiles météo |

---

## Stack technique

| Couche | Technologies |
|--------|-------------|
| Backend | Flask 3.1, requests, cache mémoire, ThreadPoolExecutor |
| Base de données | SQLite (utilisateurs + profils) |
| Authentification | itsdangerous (sessions signées + CSRF) |
| IA | Groq LLM (LLaMA 3.3 70B / LLaMA 3.1 8B) + WeatherAI (règles), avec fallback ; transcription vocale via Groq Whisper |
| Cartographie | Leaflet (self-hosted) avec tuiles OpenWeatherMap |
| Icônes | Meteocons SVG (météo), Tabler Icons (UI), flag-icons (pays) — tout self-hosted |
| Frontend | JavaScript vanilla (modules ES6), Canvas API |
| UX | Glassmorphism, animations CSS, transitions fluides, squelette de chargement |
| Streaming | Server-Sent Events (recommandations IA) |
| PWA | Service Worker, manifest.json, support hors ligne |
| Visualisations | Boussole SVG, arc solaire SVG, phases lunaires, graphiques Canvas |
| Internationalisation | FR / EN complet (fichier i18n centralisé) |
| Moteur de recherche | Dataset GeoNames (~170k villes) avec recherche par préfixe binaire |
| Génie logiciel | Cache LRU, fallback intelligent, backoff rate-limit, parallel fetching, tests Pytest |
| Production | Gunicorn, WSGI |

---

## Notes importantes

- **Cache mémoire** : ~10 minutes pour limiter les appels API (données météo) ; ~30 minutes pour les tuiles cartographiques
- **Premier chargement** : peut être légèrement plus lent (appels API parallélisés) ; les pages suivantes sont instantanées grâce au cache
- **Fichier `.env`** : obligatoire pour `OPENWEATHER_API_KEY` ; `GROQ_API_KEY` et `AUTH_SECRET_KEY` sont optionnels
- **IA Groq** : optionnelle ; sans elle, le moteur WeatherAI basé sur des règles prend automatiquement le relais
- **Authentification** : entièrement optionnelle — l'application fonctionne sans compte ; les profils permettent des recommandations personnalisées
- **Données des villes** : le fichier `backend/data/cities.json` (~8 Mo, 170k entrées) peut être reconstruit via `python bin/build_cities.py` (téléchargement depuis GeoNames, sous licence CC BY 4.0)

---

## Base de données

Le fichier `instance/meteoexpress.db` (SQLite) est créé automatiquement au premier lancement. Il contient deux tables :

- `users` — comptes utilisateurs (email, mot de passe hashé)
- `user_profiles` — profils optionnels (âge, profession, allergies, conditions chroniques)

Pour réinitialiser la base, supprimez le fichier et redémarrez l'application.

---

## Crédits

- [OpenWeatherMap](https://openweathermap.org) — données météo
- [Groq](https://groq.com) — IA LLM en temps réel
- [GeoNames](https://www.geonames.org) — dataset villes (CC BY 4.0)
- [Leaflet](https://leafletjs.com) — cartes interactives
- [Tabler Icons](https://tabler.io/icons) — icônes UI
- [flag-icons](https://flagicons.lipis.dev) — drapeaux pays
- [html2canvas](https://html2canvas.hertzen.com) — capture d'écran
- [Meteocons](https://github.com/basmilius/weather-icons) — icônes météo
- [Google Fonts](https://fonts.google.com) — typographies (Inter, Outfit, Syne)

**Créé avec soin par Cheick Yacouba Soukouna**

---

## Remerciements

Merci à OpenWeatherMap pour son API gratuite, à Groq pour l'accès à des modèles LLM performants, et à GeoNames pour son dataset mondial de villes. Ce projet a été construit avec passion, pour offrir une expérience météo moderne, intelligente et accessible à tous.

Bonne exploration !