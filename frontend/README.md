# Chronos frontend

React + TypeScript web aplikacija zasnovana na Vite-u. Frontend komunicira isključivo
sa API Gateway-em preko `VITE_API_BASE_URL`.

## Struktura

```text
src/
├── app/
│   ├── providers/       globalni React provider-i
│   └── router/          rute i izbor stranice
├── components/
│   ├── common/          generičke UI komponente
│   └── navigation/      header, navigacija i footer
├── config/              environment konfiguracija
├── features/            komponente grupisane po poslovnoj funkcionalnosti
├── hooks/               deljeni React hook-ovi
├── layouts/             okviri stranica
├── models/              TypeScript modeli API ugovora
├── pages/               komponente na nivou rute
├── services/
│   └── api/             HTTP klijent i domenski API servisi
├── store/               globalno stanje i konteksti
├── styles/              globalni stilovi i design tokeni
└── utils/               čiste pomoćne funkcije
```

`pages` sastavlja feature i common komponente, ali ne sadrži direktne `fetch` pozive.
HTTP detalji pripadaju `services`, dok poslovno UI ponašanje pripada odgovarajućem
`features` folderu.

## Komande

```powershell
npm install
npm run dev
npm run build
```

Kopirati `.env.example` u lokalni `.env` i po potrebi promeniti adresu Gateway-a.
