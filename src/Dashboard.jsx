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

const getFirstName = (fullName) => fullName.split(' ')[0];

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

export default function Dashboard() {
  const navigate = useNavigate();
  const [roster, setRoster] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [selectedCampus, setSelectedCampus] = useState('All');
  const [selectedClassroom, setSelectedClassroom] = useState('All');
  const [selectedDay, setSelectedDay] = useState(getCurrentDayKey());
  const [selectedSession, setSelectedSession] = useState('All');
  const [showFullRoster, setShowFullRoster] = useState(false);

  const today = getTodayET();

  useEffect(() => {
    const saved = localStorage.getItem('cms_auth');
    if (saved !== 'true') {
      navigate('/');
      return;
    }
    fetchRoster();
  }, [navigate]);

  // Real-time Firebase listener for attendance
  useEffect(() => {
    const attendanceRef = collection(db, 'attendance', today, 'students');
    const unsubscribe = onSnapshot(attendanceRef, (snapshot) => {
      const attendanceData = {};
      snapshot.forEach((doc) => {
        attendanceData[doc.id] = doc.data();
      });
      setAttendance(attendanceData);
      setLastUpdated(new Date());
    });

    return () => unsubscribe();
  }, [today]);

  const fetchRoster = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${ROSTER_API_URL}?action=roster`);
      const data = await response.json();
      setRoster(data);
      setLastUpdated(new Date());
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

  const classrooms = useMemo(() => {
    let filtered = roster;
    if (selectedCampus !== 'All') {
      filtered = filtered.filter(s => s.campus === selectedCampus);
    }
    const unique = [...new Set(filtered.map(s => s.classroom).filter(Boolean))];
    return ['All', ...unique.sort()];
  }, [selectedCampus, roster]);

  const filteredStudents = useMemo(() => {
    return roster.filter(student => {
      const campusMatch = selectedCampus === 'All' || student.campus === selectedCampus;
      const classroomMatch = selectedClassroom === 'All' || student.classroom === selectedClassroom;
      return campusMatch && classroomMatch;
    });
  }, [selectedCampus, selectedClassroom, roster]);

  const dailyData = useMemo(() => {
    const amKey = dayKeys[selectedDay].am;
    const pmKey = dayKeys[selectedDay].pm;

    const amByRoom = {};
    const pmByRoom = {};

    filteredStudents.forEach(student => {
      const amRoom = student[amKey];
      const pmRoom = student[pmKey];
      const studentAttendance = attendance[student.child];

      if (amRoom) {
        if (!amByRoom[amRoom]) amByRoom[amRoom] = [];
        amByRoom[amRoom].push({
          first: getFirstName(student.child),
          full: student.child,
          status: studentAttendance?.status || 'NotArrived'
        });
      }
      if (pmRoom) {
        if (!pmByRoom[pmRoom]) pmByRoom[pmRoom] = [];
        pmByRoom[pmRoom].push({
          first: getFirstName(student.child),
          full: student.child,
          status: studentAttendance?.status || 'NotArrived'
        });
      }
    });

    let amTotal = 0, amHere = 0;
    let pmTotal = 0, pmHere = 0;

    Object.keys(amByRoom).forEach(room => {
      amByRoom[room].sort((a, b) => a.first.localeCompare(b.first));
      amByRoom[room].forEach(s => {
        amTotal++;
        if (s.status === 'Here') amHere++;
      });
    });

    Object.keys(pmByRoom).forEach(room => {
      pmByRoom[room].sort((a, b) => a.first.localeCompare(b.first));
      pmByRoom[room].forEach(s => {
        pmTotal++;
        if (s.status === 'Here') pmHere++;
      });
    });

    return { am: amByRoom, pm: pmByRoom, amTotal, amHere, pmTotal, pmHere };
  }, [filteredStudents, selectedDay, attendance]);

  const handleCampusChange = (campus) => {
    setSelectedCampus(campus);
    setSelectedClassroom('All');
  };

  const currentDayFull = days.find(d => d.key === selectedDay)?.full || selectedDay;

  const SessionPanel = ({ title, icon, data, bgColor, textColor, here, total }) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        padding: '12px 20px', backgroundColor: bgColor,
        borderBottom: '1px solid #e8ebe0', fontWeight: '600', color: textColor, fontSize: '15px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span>{icon} {title}</span>
        <span style={{
          backgroundColor: 'rgba(255,255,255,0.8)',
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: '700'
        }}>
          {here}/{total} Here
        </span>
      </div>
      <div style={{ padding: '16px 20px', maxHeight: '450px', overflowY: 'auto' }}>
        {Object.keys(data).sort().map(room => {
          const roomStudents = data[room];
          const roomHere = roomStudents.filter(s => s.status === 'Here').length;
          return (
            <div key={room} style={{ marginBottom: '20px' }}>
              <div style={{
                fontWeight: '600', color: '#4f5c30', fontSize: '14px',
                marginBottom: '10px', paddingBottom: '6px', borderBottom: '2px solid #e8ebe0',
                display: 'flex', justifyContent: 'space-between'
              }}>
                <span>{room}</span>
                <span style={{ fontWeight: '400', color: '#666' }}>{roomHere}/{roomStudents.length}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {roomStudents.map((student, idx) => {
                  let chipBg = '#e0e0e0';
                  let chipColor = '#666';

                  if (student.status === 'Here') {
                    chipBg = '#c8e6c9';
                    chipColor = '#2e7d32';
                  } else if (student.status === 'PickedUp') {
                    chipBg = '#bbdefb';
                    chipColor = '#1565c0';
                  }

                  return (
                    <span key={idx} style={{
                      display: 'inline-block', padding: '6px 14px',
                      backgroundColor: chipBg, borderRadius: '20px',
                      fontSize: '14px', color: chipColor, fontWeight: '500'
                    }} title={`${student.full} - ${student.status}`}>
                      {student.first}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
        {Object.keys(data).length === 0 && (
          <div style={{ color: '#999', textAlign: 'center', padding: '40px 20px' }}>
            No students scheduled
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#fbfcf7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e8ebe0',
            borderTopColor: '#4f5c30',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#666', fontSize: '16px' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#fbfcf7',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #275375 0%, #1a3d5c 100%)',
        padding: '16px 32px',
        color: 'white',
        boxShadow: '0 4px 12px rgba(39, 83, 117, 0.3)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ← Home
            </button>
            <div>
              <h1 style={{ margin: '0 0 2px 0', fontSize: '22px', fontWeight: '600' }}>
                📋 Daily Roster
              </h1>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '12px' }}>
                {lastUpdated && `Updated: ${lastUpdated.toLocaleTimeString()}`}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={fetchRoster}
              style={{
                padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.3)',
                backgroundColor: 'transparent', color: 'white', fontSize: '13px', cursor: 'pointer'
              }}
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => setShowFullRoster(!showFullRoster)}
              style={{
                padding: '8px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.3)',
                backgroundColor: showFullRoster ? 'rgba(255,255,255,0.2)' : 'transparent',
                color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: '500'
              }}
            >
              {showFullRoster ? '← Daily View' : 'Full Roster →'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 32px' }}>
        {/* Filter Bar */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #e8ebe0'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            {/* Campus */}
            <div style={{ minWidth: '150px' }}>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: '600', color: '#4f5c30',
                marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px'
              }}>Campus</label>
              <select
                value={selectedCampus}
                onChange={(e) => handleCampusChange(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '6px',
                  border: '2px solid #e8ebe0', fontSize: '14px', backgroundColor: 'white', cursor: 'pointer'
                }}
              >
                {campuses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Classroom */}
            <div style={{ minWidth: '160px' }}>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: '600', color: '#4f5c30',
                marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px'
              }}>Classroom</label>
              <select
                value={selectedClassroom}
                onChange={(e) => setSelectedClassroom(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '6px',
                  border: '2px solid #e8ebe0', fontSize: '14px', backgroundColor: 'white', cursor: 'pointer'
                }}
              >
                {classrooms.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ width: '1px', height: '40px', backgroundColor: '#e8ebe0' }} />

            {/* Day Tabs */}
            {!showFullRoster && (
              <>
                <div>
                  <label style={{
                    display: 'block', fontSize: '11px', fontWeight: '600', color: '#4f5c30',
                    marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px'
                  }}>Day</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {days.map(day => (
                      <button
                        key={day.key}
                        onClick={() => setSelectedDay(day.key)}
                        style={{
                          width: '40px', height: '36px', borderRadius: '6px', border: 'none',
                          fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                          backgroundColor: selectedDay === day.key ? '#275375' : '#f0f0f0',
                          color: selectedDay === day.key ? 'white' : '#666'
                        }}
                        title={day.full}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ width: '1px', height: '40px', backgroundColor: '#e8ebe0' }} />

                {/* Session Toggle */}
                <div>
                  <label style={{
                    display: 'block', fontSize: '11px', fontWeight: '600', color: '#4f5c30',
                    marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px'
                  }}>Session</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {['All', 'AM', 'PM'].map(session => (
                      <button
                        key={session}
                        onClick={() => setSelectedSession(session)}
                        style={{
                          padding: '8px 14px', borderRadius: '6px', border: 'none',
                          fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                          backgroundColor: selectedSession === session
                            ? (session === 'AM' ? '#275375' : session === 'PM' ? '#4f5c30' : '#333')
                            : '#f0f0f0',
                          color: selectedSession === session ? 'white' : '#666'
                        }}
                      >
                        {session}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div style={{ flex: 1 }} />

            {/* Legend */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '6px', backgroundColor: '#c8e6c9' }} />
                <span style={{ fontSize: '11px', color: '#666' }}>Here</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '6px', backgroundColor: '#bbdefb' }} />
                <span style={{ fontSize: '11px', color: '#666' }}>Picked Up</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '6px', backgroundColor: '#e0e0e0' }} />
                <span style={{ fontSize: '11px', color: '#666' }}>Not Here</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {!showFullRoster ? (
          <div>
            {/* Day Header */}
            <div style={{
              backgroundColor: '#4f5c30', color: 'white', padding: '12px 20px',
              borderRadius: '10px 10px 0 0', fontSize: '16px', fontWeight: '600',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span>{currentDayFull}</span>
              <span style={{ fontSize: '14px', opacity: 0.9 }}>
                {selectedSession === 'All'
                  ? `${dailyData.amHere}/${dailyData.amTotal} AM · ${dailyData.pmHere}/${dailyData.pmTotal} PM`
                  : selectedSession === 'AM'
                    ? `${dailyData.amHere}/${dailyData.amTotal} here`
                    : `${dailyData.pmHere}/${dailyData.pmTotal} here`
                }
              </span>
            </div>

            {/* Session Panels */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0 0 10px 10px',
              border: '1px solid #e8ebe0',
              borderTop: 'none',
              display: 'flex',
              minHeight: '400px'
            }}>
              {(selectedSession === 'All' || selectedSession === 'AM') && (
                <SessionPanel
                  title="AM Session"
                  icon="☀️"
                  data={dailyData.am}
                  bgColor="#e8f0f7"
                  textColor="#275375"
                  here={dailyData.amHere}
                  total={dailyData.amTotal}
                />
              )}

              {selectedSession === 'All' && (
                <div style={{ width: '1px', backgroundColor: '#e8ebe0' }} />
              )}

              {(selectedSession === 'All' || selectedSession === 'PM') && (
                <SessionPanel
                  title="PM Session"
                  icon="🌙"
                  data={dailyData.pm}
                  bgColor="#f0f4e8"
                  textColor="#4f5c30"
                  here={dailyData.pmHere}
                  total={dailyData.pmTotal}
                />
              )}
            </div>
          </div>
        ) : (
          /* Full Roster View */
          <div style={{
            backgroundColor: 'white', borderRadius: '10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8ebe0', overflow: 'hidden'
          }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e8ebe0', backgroundColor: '#fafbf8' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#4f5c30' }}>
                Full Roster — {filteredStudents.length} Students
              </h2>
            </div>
            <div style={{ maxHeight: '550px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fafbf8' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#4f5c30', borderBottom: '2px solid #e8ebe0', position: 'sticky', top: 0, backgroundColor: '#fafbf8' }}>Student Name</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#4f5c30', borderBottom: '2px solid #e8ebe0', position: 'sticky', top: 0, backgroundColor: '#fafbf8' }}>Classroom</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#4f5c30', borderBottom: '2px solid #e8ebe0', position: 'sticky', top: 0, backgroundColor: '#fafbf8' }}>Campus</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#4f5c30', borderBottom: '2px solid #e8ebe0', position: 'sticky', top: 0, backgroundColor: '#fafbf8' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student, idx) => {
                    const record = attendance[student.child];
                    const status = record?.status || 'Not Here';
                    let statusBg = '#e0e0e0';
                    let statusColor = '#666';
                    let statusText = 'Not Here';

                    if (status === 'Here') {
                      statusBg = '#c8e6c9';
                      statusColor = '#2e7d32';
                      statusText = `Here (${record?.checkInTime || ''})`;
                    } else if (status === 'PickedUp') {
                      statusBg = '#bbdefb';
                      statusColor = '#1565c0';
                      statusText = 'Picked Up';
                    }

                    return (
                      <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#fafbf8' }}>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0', fontWeight: '500' }}>{student.child}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0', color: '#666' }}>{student.classroom}</td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500',
                            backgroundColor: student.campus === 'Clark Lake' ? '#e8f0f7' : '#f0e8f7',
                            color: student.campus === 'Clark Lake' ? '#275375' : '#5c2775'
                          }}>{student.campus}</span>
                        </td>
                        <td style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600',
                            backgroundColor: statusBg, color: statusColor
                          }}>{statusText}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
