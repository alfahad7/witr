const countdownEl = document.getElementById('countdown');
let alerted = false;

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

async function fetchPrayerTimes(lat, lng) {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2,'0')}-${today.getDate().toString().padStart(2,'0')}`;

  const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=4`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if(data.code === 200) {
      return data.data.timings;
    } else {
      throw new Error('خطأ في جلب المواقيت');
    }
  } catch (e) {
    countdownEl.textContent = 'خطأ في جلب مواقيت الصلاة';
    console.error(e);
    return null;
  }
}

function getTimeToWitr(timings) {
  const now = new Date();
  const ishaStr = timings.Isha;
  const fajrStr = timings.Fajr;
  const todayStr = now.toISOString().split('T')[0];

  const ishaDate = new Date(`${todayStr}T${ishaStr}:00`);
  let fajrDate = new Date(`${todayStr}T${fajrStr}:00`);

  if(fajrDate < ishaDate) {
    fajrDate.setDate(fajrDate.getDate() + 1);
  }

  const nightDuration = fajrDate - ishaDate;
  const lastThirdStart = new Date(ishaDate.getTime() + (nightDuration * 2/3));

  let targetTime;

  if(now < ishaDate) {
    targetTime = ishaDate;
  } else if(now >= ishaDate && now < fajrDate) {
    targetTime = fajrDate;
    if(now >= lastThirdStart && !alerted) {
      alerted = true;
      alert('دخلت في الثلث الأخير من الليل!');
    }
  } else {
    targetTime = ishaDate;
    targetTime.setDate(targetTime.getDate() + 1);
  }

  return targetTime;
}

function updateCountdown(targetTime) {
  const now = new Date();
  const diff = targetTime - now;

  if(diff <= 0) {
    countdownEl.textContent = '00:00:00';
    return false;
  }

  countdownEl.textContent = formatTime(diff);
  return true;
}

// ✅ الدالة الجديدة
async function startWithCoordinates(latitude, longitude) {
  let timings = await fetchPrayerTimes(latitude, longitude);
  if (!timings) return;

  function loop() {
    const targetTime = getTimeToWitr(timings);

    if (!updateCountdown(targetTime)) {
      setTimeout(async () => {
        const newTimings = await fetchPrayerTimes(latitude, longitude);
        if (newTimings) {
          timings = newTimings;
        }
      }, 60000);
    }

    requestAnimationFrame(loop);
  }

  loop();
}

// ✅ الدالة الرئيسية - تبدأ كل شيء
function startCountdown() {
  if (!navigator.geolocation) {
    countdownEl.textContent = 'المتصفح لا يدعم تحديد الموقع.';
    return;
  }

  const cachedPosition = localStorage.getItem('userLocation');
  if (cachedPosition) {
    const { latitude, longitude } = JSON.parse(cachedPosition);
    startWithCoordinates(latitude, longitude);
  } else {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        localStorage.setItem('userLocation', JSON.stringify({ latitude, longitude }));
        startWithCoordinates(latitude, longitude);
      },
      (error) => {
        countdownEl.textContent = 'تعذّر الحصول على الموقع. يرجى السماح بالوصول للموقع.';
        console.error(error);
      }
    );
  }
}

startCountdown();
