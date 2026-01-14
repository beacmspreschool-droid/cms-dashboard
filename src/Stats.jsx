import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const ROSTER_API_URL = "https://script.google.com/macros/s/AKfycbyb5_r4xGXvPIQgfJa5gOWpsKL2a0HbQ4QJszBYbEsROhRQ4136gK1hEtJKTawheaoN/exec";

const days = [
  { key: 'Mon', label: 'M', full: 'Monday' },
  { key: 'Tue', label: 'T', full: 'Tuesday' },
  { key: 'Wed', label: 'W', full: 'Wednesday' },
  { key: 'Thu', label: 'Th', full: 'Thursday' },
  { key: 'Fri', label: 'F', full: 'Friday' },
];

const dayKeys = {
  Mon: { am: 'monAM', pm: 'monPM' },
  Tue: { am: 'tueAM', pm: 'tuePM' },
  Wed: { am: 'wedAM', pm: 'wedPM' },
  Thu: { am: 'thuAM', pm: 'thuPM' },
  Fri: { am: 'friAM', pm: 'friPM' },
};

const getCurrentDayKey = () => {
  const dayIndex = new Date().getDay();
  const dayMap = { 0: 'Mon', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Mon' };
  return dayMap[dayIndex];
};

const getTodayET = () => {
  const now = new Date();
  const eastern = new Date(now.toLocaleString("en-US", { timeZone: "America/Detroit" }));
  const year = eastern.getFullYear();
  const month = String(eastern.getMonth() + 1).padStart(2, '0');
  const day = String(eastern.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Stats() {
  const navigate = useNavigate();
  const [roster, setRoster] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);

  const [selectedCampus, setSelectedCampus] = useState('All');
  const [selectedSession, setSelectedSession] = useState('AM');
  const [selectedDay, setSelectedDay] = useState(getCurrentDayKey());

  const today = getTodayET();

  useEffect(() => {
    const saved = localStorage.getItem('cms_auth');
    if (saved !== 'true') {
      navigate('/');
      return;
    }
    fetchRoster();
  }, [navigate]);

  useEffect(() => {
    const attendanceRef = collection(db, 'attendance', today, 'students');
    const unsubscribe = onSnapshot(attendanceRef, (snapshot) => {
      const attendanceData = {};
      snapshot.forEach((doc) => {
        attendanceData[doc.id] = doc.data();
      });
      setAttendance(attendanceData);
    });

    return () => unsubscribe();
  }, [today]);

  const fetchRoster = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${ROSTER_API_URL}?action=roster`);
      const data = await response.json();
      setRoster(data);
    } catch (err) {
      console.error('Error fetching roster:', err);
    } finally {
      setLoading(false);
    }
  };

  const campuses = useMemo(() => {
    const unique = [...new Set(roster.map(s => s.campus).filter(Boolean))];
    return ['All', ...unique.sort()];
  }, [roster]);

  const stats = useMemo(() => {
    const sessionKey = selectedSession === 'AM' ? dayKeys[selectedDay].am : dayKeys[selectedDay].pm;
    const byLocation = {};

    roster.forEach(student => {
      const hasSession = student[sessionKey];
      if (!hasSession) return;
      if (selectedCampus !== 'All' && student.campus !== selectedCampus) return;

      const campus = student.campus;
      const classroom = student.classroom;

      if (!byLocation[campus]) byLocation[campus] = {};
      if (!byLocation[campus][classroom]) {
        byLocation[campus][classroom] = { expected: 0, here: 0, pickedUp: 0, notHere: 0 };
      }

      byLocation[campus][classroom].expected++;

      const studentStatus = attendance[student.child]?.status;
      if (studentStatus === 'Here') {
        byLocation[campus][classroom].here++;
      } else if (studentStatus === 'PickedUp') {
        byLocation[campus][classroom].pickedUp++;
      } else {
        byLocation[campus][classroom].notHere++;
      }
    });

    const totals = { expected: 0, here: 0, pickedUp: 0, notHere: 0 };
    Object.values(byLocation).forEach(campus => {
      Object.values(campus).forEach(classroom => {
        totals.expected += classroom.expected;
        totals.here += classroom.here;
        totals.pickedUp += classroom.pickedUp;
        totals.notHere += classroom.notHere;
      });
    });

    return { byLocation, totals };
  }, [roster, attendance, selectedCampus, selectedSession, selectedDay]);

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Detroit'
  });

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#fbfcf7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid #e8ebe0', borderTopColor: '#4f5c30', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#666', fontSize: '16px' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fbfcf7', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      <div style={{ background: 'linear-gradient(135deg, #7c5c30 0%, #5c4422 100%)', padding: '16px 32px', color: 'white', boxShadow: '0 4px 12px rgba(124, 92, 48, 0.3)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>← Home</button>
            <div>
              <h1 style={{ margin: '0 0 2px 0', fontSize: '22px', fontWeight: '600' }}>📊 Attendance Stats</h1>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '12px' }}>{todayFormatted}</p>
            </div>
          </div>
          <button onClick={fetchRoster} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.3)', backgroundColor: 'transparent', color: 'white', fontSize: '13px', cursor: 'pointer' }}>🔄 Refresh</button>
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px 32px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8ebe0' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            <div style={{ minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#4f5c30', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Campus</label>
              <select value={selectedCampus} onChange={(e) => setSelectedCampus(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '2px solid #e8ebe0', fontSize: '14px', backgroundColor: 'white', cursor: 'pointer' }}>
                {campuses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ width: '1px', height: '40px', backgroundColor: '#e8ebe0' }} />
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#4f5c30', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Day</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {days.map(day => (
                  <button key={day.key} onClick={() => setSelectedDay(day.key)} style={{ width: '40px', height: '36px', borderRadius: '6px', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer', backgroundColor: selectedDay === day.key ? '#7c5c30' : '#f0f0f0', color: selectedDay === day.key ? 'white' : '#666' }} title={day.full}>{day.label}</button>
                ))}
              </div>
            </div>
            <div style={{ width: '1px', height: '40px', backgroundColor: '#e8ebe0' }} />
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#4f5c30', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Session</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['AM', 'PM'].map(session => (
                  <button key={session} onClick={() => setSelectedSession(session)} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', backgroundColor: selectedSession === session ? '#7c5c30' : '#f0f0f0', color: selectedSession === session ? 'white' : '#666' }}>{session === 'AM' ? '☀️ AM' : '🌙 PM'}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8ebe0' }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600', color: '#4f5c30' }}>{selectedSession} Session Overview</h2>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div><div style={{ fontSize: '42px', fontWeight: '700', color: '#4caf50' }}>{stats.totals.here}</div><div style={{ fontSize: '13px', color: '#666', fontWeight: '600', textTransform: 'uppercase' }}>Here Now</div></div>
            <div style={{ width: '1px', backgroundColor: '#e8ebe0' }} />
            <div><div style={{ fontSize: '42px', fontWeight: '700', color: '#2196f3' }}>{stats.totals.pickedUp}</div><div style={{ fontSize: '13px', color: '#666', fontWeight: '600', textTransform: 'uppercase' }}>Picked Up</div></div>
            <div style={{ width: '1px', backgroundColor: '#e8ebe0' }} />
            <div><div style={{ fontSize: '42px', fontWeight: '700', color: '#9e9e9e' }}>{stats.totals.notHere}</div><div style={{ fontSize: '13px', color: '#666', fontWeight: '600', textTransform: 'uppercase' }}>Not Here</div></div>
            <div style={{ width: '1px', backgroundColor: '#e8ebe0' }} />
            <div><div style={{ fontSize: '42px', fontWeight: '700', color: '#333' }}>{stats.totals.expected}</div><div style={{ fontSize: '13px', color: '#666', fontWeight: '600', textTransform: 'uppercase' }}>Expected</div></div>
          </div>
          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#666' }}>Attendance Rate</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#4f5c30' }}>{stats.totals.expected > 0 ? Math.round(((stats.totals.here + stats.totals.pickedUp) / stats.totals.expected) * 100) : 0}%</span>
            </div>
            <div style={{ height: '12px', backgroundColor: '#e8ebe0', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: stats.totals.expected > 0 ? `${(stats.totals.here / stats.totals.expected) * 100}%` : '0%', backgroundColor: '#4caf50', transition: 'width 0.3s' }} />
              <div style={{ width: stats.totals.expected > 0 ? `${(stats.totals.pickedUp / stats.totals.expected) * 100}%` : '0%', backgroundColor: '#2196f3', transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>

        {Object.keys(stats.byLocation).sort().map(campus => (
          <div key={campus} style={{ backgroundColor: 'white', borderRadius: '12px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8ebe0', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', backgroundColor: campus === 'Clark Lake' ? '#e8f0f7' : '#f0e8f7', borderBottom: '1px solid #e8ebe0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: campus === 'Clark Lake' ? '#275375' : '#5c2775' }}>{campus}</h3>
              <span style={{ fontSize: '14px', fontWeight: '600', color: campus === 'Clark Lake' ? '#275375' : '#5c2775' }}>{Object.values(stats.byLocation[campus]).reduce((sum, c) => sum + c.here, 0)} / {Object.values(stats.byLocation[campus]).reduce((sum, c) => sum + c.expected, 0)} Here</span>
            </div>
            {Object.keys(stats.byLocation[campus]).sort().map((classroom, idx) => {
              const data = stats.byLocation[campus][classroom];
              const percentage = data.expected > 0 ? Math.round(((data.here + data.pickedUp) / data.expected) * 100) : 0;
              return (
                <div key={classroom} style={{ padding: '14px 20px', borderBottom: idx < Object.keys(stats.byLocation[campus]).length - 1 ? '1px solid #f0f0f0' : 'none', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '160px', fontWeight: '500', color: '#333' }}>{classroom}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: '20px', backgroundColor: '#f5f5f5', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: data.expected > 0 ? `${(data.here / data.expected) * 100}%` : '0%', backgroundColor: '#4caf50', transition: 'width 0.3s' }} />
                      <div style={{ width: data.expected > 0 ? `${(data.pickedUp / data.expected) * 100}%` : '0%', backgroundColor: '#2196f3', transition: 'width 0.3s' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', minWidth: '180px', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '13px', color: '#4caf50', fontWeight: '600' }}>{data.here} here</span>
                    <span style={{ fontSize: '13px', color: '#2196f3', fontWeight: '600' }}>{data.pickedUp} left</span>
                    <span style={{ fontSize: '13px', color: '#999' }}>/ {data.expected}</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: percentage >= 80 ? '#4caf50' : percentage >= 50 ? '#ff9800' : '#f44336', minWidth: '40px', textAlign: 'right' }}>{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {Object.keys(stats.byLocation).length === 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '60px 20px', textAlign: 'center', color: '#999' }}>No students scheduled for this session</div>
        )}
      </div>
    </div>
  );
}
