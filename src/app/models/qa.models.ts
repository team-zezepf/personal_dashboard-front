export interface QaImage {
  filename: string;
  label: string;
  caption?: string | null;
}

export interface QaEntry {
  id: string | number;
  title: string;
  question: string;
  answer: string;
  images: QaImage[];
  tags: string[];
  authorId: string | number;
  authorName: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface QaEntryInput {
  title: string;
  question: string;
  answer: string;
  images: QaImage[];
  tags: string[];
}
