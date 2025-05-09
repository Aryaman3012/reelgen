import nano from 'nano';

// CouchDB connection
const couchUrl = process.env.COUCHDB_URL || 'http://admin:password@localhost:5984';
export const couch = nano(couchUrl);

// Database references
export const usersDb = couch.db.use<User>(process.env.COUCHDB_DATABASE || 'users');
export const inputTextsDb = couch.db.use<ReelInputText>(process.env.COUCHDB_DATABASE || 'input_texts');
export const videosDb = couch.db.use<Video>(process.env.COUCHDB_DATABASE || 'videos');

// Types
export interface User {
  _id?: string;
  _rev?: string;
  type: 'user';
  email: string;
  name: string;
  // Add more user fields as needed
}

export interface ReelInputText {
  _id?: string;
  _rev?: string;
  type: 'input_text';
  userId: string; // maps to User _id
  text: string;
  createdAt: string;
  // Add more fields as needed
}

export interface Video {
  _id?: string;
  _rev?: string;
  type: 'video';
  userId: string; // maps to User _id
  inputTextId: string; // maps to ReelInputText _id
  filePath: string;
  createdAt: string;
  // Add more fields as needed
} 