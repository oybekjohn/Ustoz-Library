/**
 * User Auth State Client
 * Hozircha Google OAuth o'chirilgan — keyingi versiyada ulanadi.
 * currentUser doim null bo'ladi.
 */

export let currentUser = null;

export async function checkAuthState() {
  // Google OAuth hozircha o'chirilgan — keyingi versiyada ulanadi
  currentUser = null;
  return null;
}

export function loginWithGoogle() {
  // Hozircha hech narsa qilmasin — keyingi versiyada ulanadi
  console.log('Google OAuth keyingi versiyada ulanadi');
}

export async function logoutUser() {
  // Hozircha hech narsa qilmasin
  currentUser = null;
}
