import { apiClient } from '../../../services/api';
import type {
  HelpCenterHomeResponseDto,
  HelpCenterQuestionDetailResponseDto,
} from '../types';

export function getHelpCenterHome(params?: { pageNumber?: number; pageSize?: number }) {
  return apiClient
    .get<HelpCenterHomeResponseDto>('/helpcenter/home', { params })
    .then((r) => r.data);
}

export function getHelpCenterQuestion(questionId: number | string) {
  return apiClient
    .get<HelpCenterQuestionDetailResponseDto>(`/helpcenter/question/${questionId}`)
    .then((r) => r.data);
}
