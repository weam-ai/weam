/**
 * Test data fixtures and constants for Playwright tests
 */

import { TEST_PASSWORD, TEST_EMAIL, TEST_FILE_PATH } from "./config";

// Base URL used by tests – must match playwright.config.ts
export const BASE_URL = 'https://weam.local';

export const TEST_USERS = {
  valid: {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  },
  invalid: {
    email: 'invalid@example.com',
    password: 'wrongpassword',
  },
};

export const TEST_EMAILS = {
  invite1: 'newuser1@yopmail.com',
  invite2: 'newuser2@example.com',
  invite3: 'testuser@example.com',
  invalid: 'invalid-email',
};

export const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
];

export const ROLES = {
  user: 'User',
  manager: 'Manager',
  admin: 'Admin',
};

export const FILE_PATH = TEST_FILE_PATH;

export const ROUTES = {
  login: '/login',
  main: '/',
  chat: '/chat',
  settingsMembers: '/settings/members',
  customTemplates: '/custom-templates',
};

export const TEST_MESSAGES = {
  simple: 'Hello, this is a test message',
  question: 'What is AI?',
  followUp: 'Tell me more',
  fileQuestion1: 'What is the main topic of this document?',
  fileQuestion2: 'Can you summarize the key points?',
};

export const AGENT = {
  brain: 'AI News',
  agent: 'Blog Topic Generator',
  prompt: 'Write a blog on agentic ai',
};

export const PROMPT = {
  brain: 'AI News',
  prompt: 'Landing Page Headlines',
};

export const DOC = {
  brain: 'AI News',
  prompt: 'Summarize this document',
  doc: 'Digital Conference 2024.docx',
};


