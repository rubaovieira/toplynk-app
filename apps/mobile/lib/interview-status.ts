import AsyncStorage from '@react-native-async-storage/async-storage';

const INTERVIEW_STATUS_KEY = '@toplynk/interview_status';

export type InterviewStatus = 'completed' | 'pending';

export async function getInterviewStatus(): Promise<InterviewStatus | null> {
  try {
    const value = await AsyncStorage.getItem(INTERVIEW_STATUS_KEY);
    if (value === 'completed' || value === 'pending') {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setInterviewStatus(status: InterviewStatus): Promise<void> {
  try {
    await AsyncStorage.setItem(INTERVIEW_STATUS_KEY, status);
  } catch {
    // Silently fail
  }
}

export async function clearInterviewStatus(): Promise<void> {
  try {
    await AsyncStorage.removeItem(INTERVIEW_STATUS_KEY);
  } catch {
    // Silently fail
  }
}
