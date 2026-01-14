import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from './firebase';
import { doc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';

// Google Sheets API for roster only
const ROSTER_API_URL = "https://script.google.com/macros/s/AKfycbyb5_r4xGXvPIQgfJa5gOWpsKL2a0HbQ4QJszBYbEsROhRQ4136gK1hEtJKTawheaoN/exec";

const getFirstName = (fullName) => fullName.split(' ')[0];

// Get today's date in Eastern Time as YYYY-MM-DD
const getTodayET = () => {
  const now = new Date();
  const eastern = new Date(now.toLocaleString("en-US", { timeZone: "America/Detroit" }));
  const year = eastern.getFullYear();
  const month = String(eastern.getMonth() + 1).padStart(2, '0');
  const day = String(eastern.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get current time in Eastern Time
const getCurrentTimeET = () => {
  const now = new Date();
  const eastern = new Date(now.toLocaleString("en-US", { timeZone: "America/Detroit" }));
  let hours = eastern.getHours();
  const minutes = String(eastern.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
};

export default function Kiosk() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [roster, setRoster] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [selectedCampus, setSelectedCampus] = useState('All');
  const [selectedClassroom, setSelectedClassroom] = useState('All');
  const [showOnlyNotHere, setShowOnlyNotHere] = useState(false);
  const [updating, setUpdating] = useState({});
  const letterRefs = useRef({});
  const today = getTodayET();

  // Check auth on mount
  useEffect(() => {
    const saved = localStorage.getItem('cms_auth');
    if (saved !== 'true') {
      navigate('/');
      return;
    }
    setIsAuthenticated(true);
    fetchRoster();
  }, [navigate]);

  // Real-time Firebase listener for attendance
  useEffect(() => {
    if (!isAuthenticated) return;

    const attendanceRef = collection(db, 'attendance', today, 'students');
    const unsubscribe = onSnapshot(attendanceRef, (snapshot) => {
      const attendanceData = {};
      snapshot.forEach((doc) => {
        attendanceData[doc.id] = doc.data();
      });
      setAttendance(attendanceData);
    });

    return () => unsubscribe();
  }, [isAuthenticated, today]);

  const fetchRoster = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${ROSTER_API_URL}?action=roster`);
      const data = await response.json();
      setRoster(data);
    } catch (err) {
      console.error('Error fetching roster:', err);
    } finally {
      setIsLoading(false);
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
    let students = roster.filter(student => {
      const campusMatch = selectedCampus === 'All' || student.campus === selectedCampus;
      const classroomMatch = selectedClassroom === 'All' || student.classroom === selectedClassroom;
      return campusMatch && classroomMatch && student.child;
    });

    if (showOnlyNotHere) {
      students = students.filter(student => {
        const status = attendance[student.child]?.status;
        return !status || status === 'NotArrived';
      });
    }

    students.sort((a, b) => getFirstName(a.child).localeCompare(getFirstName(b.child)));
    return students;
  }, [roster, selectedCampus, selectedClassroom, showOnlyNotHere, attendance]);

  const groupedStudents = useMemo(() => {
    const groups = {};
    filteredStudents.forEach(student => {
      const firstLetter = getFirstName(student.child)[0].toUpperCase();
      if (!groups[firstLetter]) groups[firstLetter] = [];
      groups[firstLetter].push(student);
    });
    return groups;
  }, [filteredStudents]);

  const availableLetters = Object.keys(groupedStudents).sort();

  const counts = useMemo(() => {
    let notHere = 0, here = 0, pickedUp = 0;
    filteredStudents.forEach(student => {
      const status = attendance[student.child]?.status;
      if (status === 'Here') here++;
      else if (status === 'PickedUp') pickedUp++;
      else notHere++;
    });
    return { notHere, here, pickedUp, total: filteredStudents.length };
  }, [filteredStudents, attendance]);

  const handleTap = async (student) => {
    const currentStatus = attendance[student.child]?.status || 'NotArrived';
    const studentDocRef = doc(db, 'attendance', today, 'students', student.child);

    setUpdating(prev => ({ ...prev, [student.child]: true }));

    try {
      if (currentStatus === 'NotArrived' || !currentStatus) {
        // Check in
        await setDoc(studentDocRef, {
          status: 'Here',
          checkInTime: getCurrentTimeET(),
          checkOutTime: '',
          campus: student.campus,
          classroom: student.classroom
        });
      } else if (currentStatus === 'Here') {
        // Check out
        await setDoc(studentDocRef, {
          ...attendance[student.child],
          status: 'PickedUp',
          checkOutTime: getCurrentTimeET()
        });
      } else {
        // Reset (delete document)
        await deleteDoc(studentDocRef);
      }
    } catch (err) {
      console.error('Error updating attendance:', err);
    } finally {
      setUpdating(prev => ({ ...prev, [student.child]: false }));
    }
  };

  const scrollToLetter = (letter) => {
    letterRefs.current[letter]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCampusChange = (campus) => {
    setSelectedCampus(campus);
    setSelectedClassroom('All');
  };

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Detroit'
  });

  if (!isAuthenticated) return null;

  if (isLoading) {
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
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #4f5c30 0%, #3d4726 100%)',
        padding: '12px 20px',
        color: 'white',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
              🏫 CMS Check-In
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', opacity: 0.9 }}>{todayFormatted}</span>
            <button
              onClick={fetchRoster}
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
              🔄
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: 'white',
        padding: '12px 20px',
        borderBottom: '1px solid #e8ebe0',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <select
            value={selectedCampus}
            onChange={(e) => handleCampusChange(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: '2px solid #e8ebe0',
              fontSize: '15px',
              backgroundColor: 'white',
              cursor: 'pointer',
              minWidth: '140px'
            }}
          >
            {campuses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={selectedClassroom}
            onChange={(e) => setSelectedClassroom(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: '2px solid #e8ebe0',
              fontSize: '15px',
              backgroundColor: 'white',
              cursor: 'pointer',
              minWidth: '160px'
            }}
          >
            {classrooms.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color: '#666',
            cursor: 'pointer',
            padding: '10px 14px',
            backgroundColor: showOnlyNotHere ? '#fff3e0' : '#f5f5f5',
            borderRadius: '8px',
            border: showOnlyNotHere ? '2px solid #ff9800' : '2px solid transparent'
          }}>
            <input
              type="checkbox"
              checked={showOnlyNotHere}
              onChange={(e) => setShowOnlyNotHere(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            Show only Not Here
          </label>
        </div>
      </div>

      {/* Status Summary */}
      <div style={{
        backgroundColor: 'white',
        padding: '12px 20px',
        borderBottom: '1px solid #e8ebe0',
        display: 'flex',
        gap: '24px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#9e9e9e'
          }} />
          <span style={{ fontSize: '14px', color: '#666' }}>
            <strong>{counts.notHere}</strong> Not Here
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#4caf50'
          }} />
          <span style={{ fontSize: '14px', color: '#666' }}>
            <strong>{counts.here}</strong> Here
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#2196f3'
          }} />
          <span style={{ fontSize: '14px', color: '#666' }}>
            <strong>{counts.pickedUp}</strong> Picked Up
          </span>
        </div>
      </div>

      {/* A-Z Jump Bar */}
      <div style={{
        backgroundColor: 'white',
        padding: '8px 20px',
        borderBottom: '1px solid #e8ebe0',
        display: 'flex',
        gap: '4px',
        flexWrap: 'wrap',
        flexShrink: 0
      }}>
        {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => {
          const isAvailable = availableLetters.includes(letter);
          return (
            <button
              key={letter}
              onClick={() => isAvailable && scrollToLetter(letter)}
              disabled={!isAvailable}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isAvailable ? '#4f5c30' : '#e8ebe0',
                color: isAvailable ? 'white' : '#ccc',
                fontSize: '13px',
                fontWeight: '600',
                cursor: isAvailable ? 'pointer' : 'default',
                opacity: isAvailable ? 1 : 0.5
              }}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Student List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
        {availableLetters.map(letter => (
          <div key={letter} ref={el => letterRefs.current[letter] = el}>
            {/* Letter Header */}
            <div style={{
              position: 'sticky',
              top: 0,
              backgroundColor: '#fbfcf7',
              padding: '12px 0 8px',
              fontSize: '14px',
              fontWeight: '700',
              color: '#4f5c30',
              borderBottom: '2px solid #4f5c30',
              marginTop: '16px',
              zIndex: 10
            }}>
              {letter}
            </div>

            {/* Students */}
            {groupedStudents[letter].map((student, idx) => {
              const record = attendance[student.child];
              const status = record?.status || 'NotArrived';
              const isUpdating = updating[student.child];

              let bgColor = '#f5f5f5';
              let borderColor = '#e0e0e0';
              let statusIcon = '⚪';
              let statusText = '';

              if (status === 'Here') {
                bgColor = '#e8f5e9';
                borderColor = '#4caf50';
                statusIcon = '🟢';
                statusText = record?.checkInTime ? `✓ ${record.checkInTime}` : '✓ Here';
              } else if (status === 'PickedUp') {
                bgColor = '#e3f2fd';
                borderColor = '#2196f3';
                statusIcon = '🔵';
                statusText = record?.checkInTime && record?.checkOutTime
                  ? `✓ ${record.checkInTime} → ${record.checkOutTime}`
                  : 'Picked Up';
              }

              return (
                <button
                  key={student.child}
                  onClick={() => !isUpdating && handleTap(student)}
                  disabled={isUpdating}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    marginTop: '8px',
                    backgroundColor: bgColor,
                    border: `2px solid ${borderColor}`,
                    borderRadius: '10px',
                    cursor: isUpdating ? 'wait' : 'pointer',
                    opacity: isUpdating ? 0.6 : 1,
                    transition: 'all 0.15s',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>{statusIcon}</span>
                    <span style={{ fontSize: '17px', fontWeight: '600', color: '#333' }}>
                      {getFirstName(student.child)}
                    </span>
                    <span style={{ fontSize: '13px', color: '#888' }}>
                      {student.classroom}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {isUpdating ? '...' : statusText}
                  </div>
                </button>
              );
            })}
          </div>
        ))}

        {filteredStudents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
            No students match your filters
          </div>
        )}
      </div>
    </div>
  );
}
