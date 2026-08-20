const DEFAULT_DATA = {
  waitCount: 0,
  baseMinutes: 0,
  isOpen: true,
  updatedAt: new Date().toISOString()
};

function loadData() {
  const saved = localStorage.getItem("ghostHouseData");

  if (!saved) {
    return { ...DEFAULT_DATA };
  }

  try {
    return {
      ...DEFAULT_DATA,
      ...JSON.parse(saved)
    };
  } catch (error) {
    return { ...DEFAULT_DATA };
  }
}

function saveData(data) {
  localStorage.setItem(
    "ghostHouseData",
    JSON.stringify(data)
  );
}

function waitTime(data) {
  const count = Number(data.waitCount) || 0;
  const base = Number(data.baseMinutes) || 0;

  return Math.max(
    0,
    Math.round(base + count * 3)
  );
}

function congestion(minutes) {
  if (minutes <= 10) {
    return ["空いています", "green"];
  }

  if (minutes <= 20) {
    return ["やや混雑", "yellow"];
  }

  if (minutes <= 30) {
    return ["混雑しています", "orange"];
  }

  return ["かなり混雑しています", "red"];
}

function updatedText(updatedAt) {
  if (!updatedAt) {
    return "--:--";
  }

  const date = new Date(updatedAt);

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
