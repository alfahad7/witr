<script>
const countdownEl = document.getElementById('countdown');
let alerted = false;

// تنسيق الوقت
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return ${hours}:${minutes}:${seconds};
}

// جلب أوقات الصلاة من API
async function fetchPrayerTimes(lat, lng) {
  const today = new Date();
  const dateStr = ${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2,'0')}-${today.getDate().toString().padStart(2,'0')};

  const url = https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=4;

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

// حساب الوقت المتبقي للوتر
function getTimeToWitr(timings) {
  const now = new Date();
  const ishaStr = timings.Isha;
  const fajrStr = timings.Fajr;
  const todayStr = now.toISOString().split('T')[0];

  const ishaDate = new Date(`${todayStr}T${ishaStr}:00`);
  let fajrDate = new Date(`${todayStr}T${fajrStr}:00`);

  if (fajrDate < ishaDate) {
    fajrDate.setDate(fajrDate.getDate() + 1);
  }

  const nightDuration = fajrDate - ishaDate;
  const lastThirdStart = new Date(ishaDate.getTime() + (nightDuration * 2/3));

  let targetTime;

  if (now < ishaDate) {
    targetTime = ishaDate;
  } else if (now >= ishaDate && now < fajrDate) {
    targetTime = fajrDate;
    if (now >= lastThirdStart && !alerted) {
      alerted = true;
      alert('دخلت في الثلث الأخير من الليل!');
    }
  } else {
    targetTime = ishaDate;
    targetTime.setDate(targetTime.getDate() + 1);
  }

  return targetTime;
}

// تحديث العد التنازلي
function updateCountdown(targetTime) {
  const now = new Date();
  const diff = targetTime - now;

  if (diff <= 0) {
    countdownEl.textContent = '00:00:00';
    return false;
  }

  countdownEl.textContent = formatTime(diff);
  return true;
}

// بدء العد التنازلي (مع حفظ الموقع)
async function startCountdown() {
  let coords = localStorage.getItem('coords');

  if (coords) {
    coords = JSON.parse(coords);
    runCountdownWithCoords(coords.latitude, coords.longitude);
  } else {
    if (!navigator.geolocation) {
      countdownEl.textContent = 'المتصفح لا يدعم تحديد الموقع.';
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      // حفظ الإحداثيات
      localStorage.setItem('coords', JSON.stringify({ latitude, longitude }));

      runCountdownWithCoords(latitude, longitude);

    }, (error) => {
      countdownEl.textContent = 'تعذّر الحصول على الموقع.';
      console.error(error);
    });
  }
}

// وظيفة تشغيل العدّاد بناءً على إحداثيات
async function runCountdownWithCoords(latitude, longitude) {
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

// زر إعادة تحديد الموقع (اختياري)
function resetLocation() {
  localStorage.removeItem("coords");
  location.reload();
}

// تشغيل العدّاد
startCountdown();
</script>
