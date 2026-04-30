'use server';

import { getProject } from './db';

export async function getProjectById(id: string) {
    return getProject(id);
}