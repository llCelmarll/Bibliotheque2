export function formatDate(dateString: string): string {
	try {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('fr-FR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		}).format(date);
	} catch (error) {
		return dateString || "Date invalide";
	}
}

export function formatDateOnly(dateString: string): string {
	try {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('fr-FR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
		}).format(date);
	} catch (error) {
		return dateString || "Date invalide";
	}
}