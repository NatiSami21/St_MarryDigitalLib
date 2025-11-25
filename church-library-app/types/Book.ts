export type Book = {
  book_code: string;
  title: string;
  author: string;
  category: string;
  notes?: string;
  copies: number;
  created_at?: string;
  updated_at?: string;
  sync_status?: string;
};
