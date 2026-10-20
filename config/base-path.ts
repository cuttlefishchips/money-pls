export function basePath(githubRepository: string | undefined): string {
  const name = githubRepository?.split('/')[1];
  return name ? `/${name}/` : '/';
}
