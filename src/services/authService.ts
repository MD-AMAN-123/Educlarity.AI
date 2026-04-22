import { supabase } from './supabaseClient';
import { User } from '../types';

export const logUserLogin = async (user: User) => {
  try {
    const { error } = await supabase
      .from('user_logins')
      .insert([
        {
          user_id: user.id,
          email: user.email,
          login_at: new Date().toISOString(),
          metadata: {
            name: user.name,
            userAgent: navigator.userAgent,
            platform: navigator.platform
          }
        }
      ]);

    if (error) {
      console.error('Error logging user login:', error.message);
    }
  } catch (err) {
    console.error('Failed to log user login:', err);
  }
};
