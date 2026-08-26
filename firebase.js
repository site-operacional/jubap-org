import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Verdadeiro somente quando o .env foi preenchido com um projeto Firebase real.
// Usado pela interface para avisar a pessoa em vez de simplesmente travar a tela.
export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const app = getApps().length ? getApp() : initializeApp(
  firebaseConfigured ? firebaseConfig : { apiKey: 'demo-key', authDomain: 'demo.firebaseapp.com', projectId: 'demo-project' }
);
export const auth = getAuth(app);
export const dbFirestore = getFirestore(app);

// Instância secundária, usada apenas para criar novos usuários (Configurações > Usuários)
// sem derrubar a sessão do administrador que está logado.
let secondaryApp;
export function getSecondaryAuth() {
  if (!secondaryApp) {
    secondaryApp = initializeApp(firebaseConfig, 'secondary');
  }
  return getAuth(secondaryApp);
}
