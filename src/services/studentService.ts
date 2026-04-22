import { supabase } from './supabaseClient';
import { Student } from '../types';

export const fetchStudents = async (userId?: string): Promise<Student[]> => {
  try {
    let query = supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.warn('Supabase fetch error:', error.message);
      return [];
    }
    
    return (data as Student[]) || [];
  } catch (err) {
    console.warn('Network error fetching students.');
    return [];
  }
};

export const addStudent = async (student: Omit<Student, 'id'>, userId: string): Promise<Student | null> => {
  try {
    const { data, error } = await supabase
      .from('students')
      .insert([{ ...student, user_id: userId }])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error.message);
      return null;
    }
    return data as Student;
  } catch (err) {
    console.error('Network error adding student.');
    return null;
  }
};

export const updateStudent = async (id: string, updates: Partial<Student>): Promise<Student | null> => {
  const { id: _, ...safeUpdates } = updates as any;

  try {
    const { data, error } = await supabase
      .from('students')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error.message);
      return null;
    }
    return data as Student;
  } catch (err) {
    console.error('Network error updating student.');
    return null;
  }
};

export const removeStudent = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Network error deleting student.');
    return false;
  }
};