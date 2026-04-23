export interface HelpCenterCategoryDto {
  id: number | string;
  name: string;
  description: string | null;
  status: boolean;
  orderNum: number | string;
  createdWhen: string | null;
  lastEditedWhen: string | null;
  accessLevel: number | string;
  icon: string | null;
}

export interface HelpCenterQuestionByCategoryDto {
  categoryId: number | string;
  name: string;
  icon: string | null;
  questionId: number | string;
  question: string;
  status: number | string;
}

export interface HelpCenterPendingQuestionDto {
  questionId: number | string;
  question: string;
  createdBy: number | string;
  questionCreator: string;
  status: number | string;
  categoryId: number | string;
  name: string;
  voteCount: number | string;
  createdWhen: string | null;
}

export interface HelpCenterHomeResponseDto {
  categories: HelpCenterCategoryDto[];
  questionsByCategory: HelpCenterQuestionByCategoryDto[];
  pendingQuestions: HelpCenterPendingQuestionDto[];
  totalPendingQuestions: number | string;
  pageNumber: number | string;
  pageSize: number | string;
}

export interface HelpCenterAnswerDto {
  answerId: number | string;
  questionId: number | string;
  answer: string;
  createdBy: number | string;
  answeredBy: string;
  createdWhen: string | null;
  lastEditedWhen: string | null;
  likeCount: number | string;
}

export interface HelpCenterQuestionDetailDto {
  questionId: number | string;
  question: string;
  createdBy: number | string;
  questionCreator: string;
  createdWhen: string | null;
  status: number | string;
  approvedBy: number | string | null;
  approvedWhen: string | null;
  categoryId: number | string;
  name: string;
  icon: string | null;
  voteCount: number | string;
}

export interface HelpCenterQuestionsByCategoryDto {
  questionId: number | string;
  question: string;
  createdBy: number | string;
  status: number | string;
  categoryId: number | string;
  name: string | null;
  voteCount: number | string;
}

export interface HelpCenterQuestionDetailResponseDto {
  questionDetails: HelpCenterQuestionDetailDto | null;
  categories: HelpCenterCategoryDto[];
  questionsByCategory: HelpCenterQuestionsByCategoryDto[];
  answers: HelpCenterAnswerDto[];
}
