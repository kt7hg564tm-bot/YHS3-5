import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// ==============================
// Firestore上の設定データ
// ==============================

const settingsRef = doc(
  db,
  "system",
  "settings"
);


// ==============================
// 初期設定
// ==============================

const DEFAULT_SETTINGS = {
  waitCount: 0,
  baseMinutes: 0,

  // お化け屋敷そのものの受付
  receptionOpen: true,

  // 予約受付は別管理
  reservationOpen: true,

  // 今後の予約機能で使用
  capacityPerSlot: 10,
  maxPeoplePerGroup: 4,

  day1Date: "",
day2Date: "",
  
  // 1日目・2日目で別々に設定
  day1AvailableTimes: [],
  day2AvailableTimes: []
};


// ==============================
// 設定を読み込む
// ==============================

async function loadSettings() {
  const snapshot = await getDoc(settingsRef);

  // Firestoreにまだ設定がない場合
  if (!snapshot.exists()) {
    await setDoc(settingsRef, {
      ...DEFAULT_SETTINGS,
      updatedAt: serverTimestamp()
    });

    return {
      ...DEFAULT_SETTINGS,
      updatedAt: null
    };
  }

  return {
    ...DEFAULT_SETTINGS,
    ...snapshot.data()
  };
}


// ==============================
// 設定を保存する
// ==============================

async function saveSettings(settings) {
  await setDoc(
    settingsRef,
    {
      ...settings,
      updatedAt: serverTimestamp()
    },
    {
      merge: true
    }
  );
}


// ==============================
// リアルタイム監視
// ==============================

function watchSettings(callback) {
  return onSnapshot(
    settingsRef,

    (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      callback({
        ...DEFAULT_SETTINGS,
        ...snapshot.data()
      });
    },

    (error) => {
      console.error(
        "設定データの監視に失敗しました:",
        error
      );
    }
  );
}


// ==============================
// 待ち時間計算
// ==============================

function waitTime(data) {
  const count =
    Number(data.waitCount) || 0;

  const base =
    Number(data.baseMinutes) || 0;

  return Math.max(
    0,
    Math.round(base + count * 3)
  );
}


// ==============================
// 混雑状況
// ==============================

function congestion(minutes) {
  if (minutes <= 10) {
    return [
      "空いています",
      "green"
    ];
  }

  if (minutes <= 20) {
    return [
      "やや混雑",
      "yellow"
    ];
  }

  if (minutes <= 30) {
    return [
      "混雑しています",
      "orange"
    ];
  }

  return [
    "かなり混雑しています",
    "red"
  ];
}


// ==============================
// 最終更新時刻
// ==============================

function updatedText(updatedAt) {
  if (!updatedAt) {
    return "--:--";
  }

  // Firestore Timestamp
  const date =
    typeof updatedAt.toDate === "function"
      ? updatedAt.toDate()
      : new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString(
    "ja-JP",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}


// ==============================
// 他ファイルから利用
// ==============================

export {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  watchSettings,
  waitTime,
  congestion,
  updatedText
};
