/**
 * User Auth State Client
 */

export let currentUser = null;

export async function checkAuthState() {
  try {
    const res = await fetch('/api/user/me');
    if (res.ok) {
      const data = await res.json();
      if (data.authenticated && data.user) {
        currentUser = data.user;
        return currentUser;
      }
    }
  } catch (err) {
    console.error('Auth state check error:', err);
  }
  currentUser = null;
  return null;
}

export function loginWithGoogle() {
  window.location.href = '/api/user-auth/google/start';
}

export async function logoutUser() {
  try {
    await fetch('/api/user-auth/logout', { method: 'POST' });
  } catch (err) {
    console.error('Logout error:', err);
  }
  window.location.reload();
}
