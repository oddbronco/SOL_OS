export const getInterviewBaseUrl = (): string => {
  const hostname = window.location.hostname;

  // Production domain - always use interviews subdomain
  if (hostname === 'speakprojects.com' || hostname === 'www.speakprojects.com') {
    return 'https://interviews.speakprojects.com';
  }

  // Netlify deploy previews - also use production interviews subdomain
  if (hostname.includes('netlify.app')) {
    return 'https://interviews.speakprojects.com';
  }

  // Development - use local origin
  if (hostname === 'localhost' || hostname.includes('127.0.0.1')) {
    return window.location.origin;
  }

  // Fallback - use production interviews subdomain
  return 'https://interviews.speakprojects.com';
};

export const generateInterviewUrl = (sessionToken: string): string => {
  const baseUrl = getInterviewBaseUrl();
  return `${baseUrl}/interview/${sessionToken}`;
};

export const generatePasscodeInterviewUrl = (projectId: string, stakeholderId: string): string => {
  const baseUrl = getInterviewBaseUrl();
  return `${baseUrl}/interview?project=${projectId}&stakeholder=${stakeholderId}`;
};
