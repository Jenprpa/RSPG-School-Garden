import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Hardcoded Firebase Config from user's project settings to connect automatically
const defaultFirebaseConfig = {
  apiKey: "AlzaSyC-IHT36beAyYZY-RFFchSMDRx6LqVRO6E",
  authDomain: "rspg-school-garden.firebaseapp.com",
  projectId: "rspg-school-garden",
  storageBucket: "rspg-school-garden.firebasestorage.app",
  messagingSenderId: "891945309006",
  appId: "1:891945309006:web:f6c2a4b8c144f33843041f",
  measurementId: "G-3V4SHJ4R40"
};

const getFirebaseConfig = () => {
  // Use hardcoded config as default, or fallback to local storage overrides
  const localConfig = localStorage.getItem('rspg_firebase_config');
  if (localConfig) {
    try {
      return {
        config: JSON.parse(localConfig),
        isConfigured: true
      };
    } catch (e) {
      console.error('Error parsing Firebase config:', e);
    }
  }
  return {
    config: defaultFirebaseConfig,
    isConfigured: true
  };
};

const setupFirebase = () => {
  const { config, isConfigured } = getFirebaseConfig();
  if (!isConfigured || !config) {
    return { app: null, db: null, storage: null, isConfigured: false };
  }

  try {
    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    const db = getFirestore(app);
    const storage = getStorage(app);
    return { app, db, storage, isConfigured: true };
  } catch (err) {
    console.error('Firebase initialization error:', err);
    return { app: null, db: null, storage: null, isConfigured: false };
  }
};

const firebaseSystem = setupFirebase();

export const db = firebaseSystem.db;
export const storage = firebaseSystem.storage;

export const isFirebaseConfigured = () => {
  return firebaseSystem.isConfigured;
};

export const getSavedCredentials = () => {
  const { config } = getFirebaseConfig();
  return config;
};

export const saveCredentials = (configObject, geminiKey = '') => {
  localStorage.setItem('rspg_firebase_config', JSON.stringify(configObject));
  if (geminiKey) {
    localStorage.setItem('rspg_gemini_key', geminiKey);
  }
  window.location.reload();
};

export const clearCredentials = () => {
  localStorage.removeItem('rspg_firebase_config');
  localStorage.removeItem('rspg_gemini_key');
  window.location.reload();
};

export const getGeminiKey = () => {
  return import.meta.env.VITE_GEMINI_KEY || localStorage.getItem('rspg_gemini_key') || '';
};

// Canvas-based image compression helper (max dimension: 1600px, JPEG quality: 75%)
export const compressImage = (file, maxDimension = 1600, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return resolve(file); // Return original if not an image
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Keep aspect ratio while resizing if exceeds maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            return reject(new Error('Canvas toBlob returned null'));
          }
          const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          const compressedFile = new File([blob], `${baseName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(compressedFile);
        }, 'image/jpeg', quality);
      };
      img.onerror = (err) => reject(err);
      img.src = event.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

