import { supabase } from './supabaseClient';
import { DashboardStats } from '../types';

export const fetchUserStats = async (userId: string): Promise<DashboardStats | null> => {
  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select('stats')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error fetching user stats:', error.message);
      }
      return null;
    }

    return data.stats as DashboardStats;
  } catch (err) {
    console.error('Failed to fetch user stats:', err);
    return null;
  }
};

export const saveUserStats = async (userId: string, stats: DashboardStats) => {
  try {
    const { error } = await supabase
      .from('user_stats')
      .upsert({ user_id: userId, stats, updated_at: new Date().toISOString() });

    if (error) {
      console.error('Error saving user stats:', error.message);
    }
  } catch (err) {
    console.error('Failed to save user stats:', err);
  }
};
