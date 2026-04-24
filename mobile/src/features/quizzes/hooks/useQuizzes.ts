import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  fetchQuizCreators,
  fetchQuizDetails,
  fetchQuizPlayers,
  fetchQuizzes,
  type QuizzesPage,
} from '../../../services/api';

const PAGE_SIZE = 25;

export function useQuizzes() {
  return useInfiniteQuery<QuizzesPage>({
    queryKey: ['quizzes', 'list'],
    queryFn: ({ pageParam = 1 }) => fetchQuizzes(pageParam as number, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.hasNextPage ? last.pagination.currentPage + 1 : undefined,
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useQuizCreators() {
  return useQuery({
    queryKey: ['quizzes', 'creators'],
    queryFn: () => fetchQuizCreators(10),
    staleTime: 5 * 60 * 1000,
  });
}

export function useQuizDetails(quizId: number | string | null) {
  return useQuery({
    queryKey: ['quizzes', 'detail', quizId],
    queryFn: () => fetchQuizDetails(quizId as number | string),
    enabled: quizId !== null && quizId !== undefined,
    staleTime: 2 * 60 * 1000,
  });
}

export function useQuizPlayers(quizId: number | string | null) {
  return useQuery({
    queryKey: ['quizzes', 'players', quizId],
    queryFn: () => fetchQuizPlayers(quizId as number | string, 1, 25),
    enabled: quizId !== null && quizId !== undefined,
    staleTime: 60 * 1000,
  });
}
