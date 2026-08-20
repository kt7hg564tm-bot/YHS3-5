import { db } from "./firebase.js";

import {
  doc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// ==============================
// 4桁の予約番号を生成
// ==============================

function generateReservationNumber() {
  const array = new Uint32Array(1);

  crypto.getRandomValues(array);

  const number =
    array[0] % 10000;

  return String(number).padStart(4, "0");
}


// ==============================
// 予約枠IDを作る
// 例：2026-09-05_10-00
// ==============================

function makeSlotId(date, time) {
  return (
    date +
    "_" +
    time.replace(":", "-")
  );
}


// ==============================
// 予約時刻をDateに変換
//
// 今回の文化祭は日本開催なので
// 日本時間（+09:00）として扱う
// ==============================

function reservationDateTime(
  date,
  time
) {
  return new Date(
    date +
    "T" +
    time +
    ":00+09:00"
  );
}


// ==============================
// 実際の予約処理
// ==============================

async function createReservation({
  day,
  date,
  time,
  people
}) {

  // ----------------------------
  // 基本的な入力チェック
  // ----------------------------

  if (
    day !== 1 &&
    day !== 2
  ) {
    throw new Error(
      "予約日の指定が正しくありません。"
    );
  }

  if (!date || !time) {
    throw new Error(
      "予約日時が正しくありません。"
    );
  }

  if (
    !Number.isInteger(people) ||
    people < 1
  ) {
    throw new Error(
      "人数が正しくありません。"
    );
  }


  // ----------------------------
  // 最大30回まで
  // ランダム予約番号を生成
  //
  // すでに同じ番号が存在した場合、
  // 新しい番号でやり直す
  // ----------------------------

  for (
    let attempt = 0;
    attempt < 30;
    attempt++
  ) {

    const reservationNumber =
      generateReservationNumber();

    const reservationRef =
      doc(
        db,
        "reservations",
        reservationNumber
      );

    const settingsRef =
      doc(
        db,
        "system",
        "settings"
      );

    const slotId =
      makeSlotId(
        date,
        time
      );

    const slotRef =
      doc(
        db,
        "reservationSlots",
        slotId
      );


    try {

      const result =
        await runTransaction(
          db,
          async (transaction) => {

            // --------------------
            // Firestoreから
            // 最新設定を取得
            // --------------------

            const settingsSnapshot =
              await transaction.get(
                settingsRef
              );

            if (
              !settingsSnapshot.exists()
            ) {
              throw new Error(
                "予約設定が見つかりません。"
              );
            }

            const settings =
              settingsSnapshot.data();


            // --------------------
            // 予約受付状態
            // --------------------

            if (
              !settings.reservationOpen
            ) {
              throw new Error(
                "現在、予約受付を停止しています。"
              );
            }


            // --------------------
            // 日付チェック
            // --------------------

            const expectedDate =
              day === 1
                ? settings.day1Date
                : settings.day2Date;

            if (
              date !== expectedDate
            ) {
              throw new Error(
                "この日の予約設定が変更されました。ページを再読み込みしてください。"
              );
            }


            // --------------------
            // 予約可能時間チェック
            // --------------------

            const availableTimes =
              day === 1
                ? settings.day1AvailableTimes
                : settings.day2AvailableTimes;

            if (
              !Array.isArray(
                availableTimes
              ) ||
              !availableTimes.includes(
                time
              )
            ) {
              throw new Error(
                "この時間は現在予約できません。"
              );
            }


            // --------------------
            // 最大人数チェック
            // --------------------

            const maxPeople =
              Number(
                settings.maxPeoplePerGroup
              );

            if (
              !Number.isInteger(
                maxPeople
              ) ||
              people > maxPeople
            ) {
              throw new Error(
                "1組の最大人数を超えています。"
              );
            }


            // --------------------
            // 予約締切チェック
            //
            // 10:00枠なら
            // 10:00になった時点で終了
            // --------------------

            const startTime =
              reservationDateTime(
                date,
                time
              );

            if (
              Date.now() >=
              startTime.getTime()
            ) {
              throw new Error(
                "この時間の予約は終了しました。"
              );
            }


            // --------------------
            // 定員チェック
            // --------------------

            const capacity =
              Number(
                settings.capacityPerSlot
              );

            if (
              !Number.isInteger(
                capacity
              ) ||
              capacity < 1
            ) {
              throw new Error(
                "予約枠の定員設定が正しくありません。"
              );
            }


            const slotSnapshot =
              await transaction.get(
                slotRef
              );

            let reservationCount = 0;

            if (
              slotSnapshot.exists()
            ) {
              reservationCount =
                Number(
                  slotSnapshot.data()
                    .reservationCount
                ) || 0;
            }


            // 定員を途中で下げた場合でも、
            // 既存予約は有効。
            // 新規予約だけ停止する。
            if (
              reservationCount >=
              capacity
            ) {
              throw new Error(
                "この時間は満員です。"
              );
            }


            // --------------------
            // 予約番号の重複チェック
            // --------------------

            const reservationSnapshot =
              await transaction.get(
                reservationRef
              );

            if (
              reservationSnapshot.exists()
            ) {
              throw new Error(
                "RESERVATION_NUMBER_COLLISION"
              );
            }


            // --------------------
            // 予約枠の人数を更新
            // --------------------

            transaction.set(
              slotRef,
              {
                day,
                date,
                time,

                reservationCount:
                  reservationCount + 1,

                updatedAt:
                  serverTimestamp()
              },
              {
                merge: true
              }
            );


            // --------------------
            // 予約情報を保存
            // --------------------

            transaction.set(
              reservationRef,
              {
                reservationNumber,

                day,
                date,
                time,

                people,

                status:
                  "reserved",

                // 予約成立時点の定員も記録
                capacityAtReservation:
                  capacity,

                createdAt:
                  serverTimestamp(),

                updatedAt:
                  serverTimestamp()
              }
            );


            return {
              reservationNumber,
              day,
              date,
              time,
              people
            };
          }
        );


      // 予約成功
      return result;


    } catch (error) {

      // ランダム番号が既存番号と
      // 重複した場合だけ再試行
      if (
        error.message ===
        "RESERVATION_NUMBER_COLLISION"
      ) {
        continue;
      }

      // それ以外のエラーは
      // そのまま呼び出し元へ
      throw error;
    }
  }


  throw new Error(
    "予約番号を発行できませんでした。もう一度お試しください。"
  );
}


// ==============================
// 外部から使用
// ==============================

export {
  createReservation
};
