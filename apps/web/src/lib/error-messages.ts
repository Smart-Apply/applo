/**
 * Frontend error code mappings and user-friendly messages (all UI locales)
 * 
 * These messages are used as fallbacks when the backend doesn't provide
 * a user-friendly message, or for client-side errors (network, etc.)
 */

import { getActiveLocale } from './i18n-runtime';
import type { Locale } from '@/i18n/config';

export enum ErrorCode {
  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  UNAUTHORIZED = 'UNAUTHORIZED',
  USER_EXISTS = 'USER_EXISTS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  REFRESH_TOKEN_INVALID = 'REFRESH_TOKEN_INVALID',
  REFRESH_TOKEN_NOT_FOUND = 'REFRESH_TOKEN_NOT_FOUND',
  INVALID_TOKEN_TYPE = 'INVALID_TOKEN_TYPE',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // Profile errors
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',
  PROFILE_INCOMPLETE = 'PROFILE_INCOMPLETE',
  PROFILE_UPDATE_FAILED = 'PROFILE_UPDATE_FAILED',
  
  // Job posting errors
  JOB_POSTING_NOT_FOUND = 'JOB_POSTING_NOT_FOUND',
  JOB_POSTING_PARSE_FAILED = 'JOB_POSTING_PARSE_FAILED',
  
  // Application errors
  APPLICATION_NOT_FOUND = 'APPLICATION_NOT_FOUND',
  APPLICATION_DUPLICATE = 'APPLICATION_DUPLICATE',
  APPLICATION_GENERATING = 'APPLICATION_GENERATING',
  APPLICATION_GENERATION_FAILED = 'APPLICATION_GENERATION_FAILED',
  APPLICATION_NOT_FAILED = 'APPLICATION_NOT_FAILED',
  APPLICATION_NO_RESUME = 'APPLICATION_NO_RESUME',
  APPLICATION_NO_JOB = 'APPLICATION_NO_JOB',
  APPLICATION_RESUME_CORRUPTED = 'APPLICATION_RESUME_CORRUPTED',
  
  // LLM errors
  LLM_TIMEOUT = 'LLM_TIMEOUT',
  LLM_PARSE_ERROR = 'LLM_PARSE_ERROR',
  LLM_INVALID_RESPONSE = 'LLM_INVALID_RESPONSE',

  // AI prompt guardrails (issue #520)
  AI_PROMPT_TOO_LONG = 'AI_PROMPT_TOO_LONG',
  
  // File upload errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_INVALID_TYPE = 'FILE_INVALID_TYPE',
  
  // Password errors
  PASSWORD_INCORRECT = 'PASSWORD_INCORRECT',
  PASSWORD_SAME_AS_CURRENT = 'PASSWORD_SAME_AS_CURRENT',
  PASSWORD_CHANGE_OAUTH = 'PASSWORD_CHANGE_OAUTH',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Client-side errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // Generic errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  FORBIDDEN = 'FORBIDDEN',
}

/**
 * User-friendly error messages for frontend display, keyed by error code
 * and locale. These provide context and actionable next steps for users.
 * Kept as an in-code bilingual dictionary (not in messages/*.json) so the
 * client bundle only carries these strings — see lib/i18n-runtime.ts.
 */
export const ERROR_MESSAGES: Record<Locale, Record<string, string>> = {
  de: {
    // Authentication errors
    [ErrorCode.INVALID_CREDENTIALS]: 'E-Mail oder Passwort ist falsch. Bitte versuche es erneut.',
    [ErrorCode.UNAUTHORIZED]: 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.',
    [ErrorCode.USER_EXISTS]: 'Ein Konto mit dieser E-Mail existiert bereits. Bitte melde dich an.',
    [ErrorCode.USER_NOT_FOUND]: 'Benutzer nicht gefunden. Bitte melde dich erneut an.',
    [ErrorCode.REFRESH_TOKEN_INVALID]: 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.',
    [ErrorCode.REFRESH_TOKEN_NOT_FOUND]: 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.',
    [ErrorCode.INVALID_TOKEN_TYPE]: 'Deine Anmeldung ist ungültig. Bitte melde dich erneut an.',
    [ErrorCode.SESSION_EXPIRED]: 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.',

    // Profile errors
    [ErrorCode.PROFILE_NOT_FOUND]: 'Bitte erstelle zuerst dein Profil im Profil-Bereich.',
    [ErrorCode.PROFILE_INCOMPLETE]: 'Bitte vervollständige dein Profil, bevor du fortfährst.',
    [ErrorCode.PROFILE_UPDATE_FAILED]: 'Profil konnte nicht aktualisiert werden. Bitte versuche es erneut.',

    // Job posting errors
    [ErrorCode.JOB_POSTING_NOT_FOUND]: 'Stellenanzeige nicht gefunden. Möglicherweise wurde sie gelöscht.',
    [ErrorCode.JOB_POSTING_PARSE_FAILED]: 'Die Stellenanzeige konnte nicht verarbeitet werden. Bitte überprüfe das Format.',

    // Application errors
    [ErrorCode.APPLICATION_NOT_FOUND]: 'Bewerbung nicht gefunden. Möglicherweise wurde sie gelöscht.',
    [ErrorCode.APPLICATION_DUPLICATE]: 'Du hast bereits eine Bewerbung für diese Stelle erstellt. Bitte bearbeite die bestehende Bewerbung oder lösche sie zuerst.',
    [ErrorCode.APPLICATION_GENERATING]: 'Dokumente werden aktuell erstellt. Bitte warte einen Moment.',
    [ErrorCode.APPLICATION_GENERATION_FAILED]: 'Die Bewerbung konnte nicht erstellt werden. Bitte versuche es erneut.',
    [ErrorCode.APPLICATION_NOT_FAILED]: 'Nur fehlgeschlagene Bewerbungen können erneut generiert werden.',
    [ErrorCode.APPLICATION_NO_RESUME]: 'Bitte speichere zuerst deinen Lebenslauf.',
    [ErrorCode.APPLICATION_NO_JOB]: 'Keine Stellenanzeige verknüpft. Bitte wähle eine Stelle aus.',
    [ErrorCode.APPLICATION_RESUME_CORRUPTED]: 'Gespeicherter Lebenslauf ist beschädigt. Bitte aktualisiere ihn.',

    // LLM errors
    [ErrorCode.LLM_TIMEOUT]: 'Die KI-Generierung dauert länger als erwartet. Deine Bewerbung wird im Hintergrund erstellt.',
    [ErrorCode.LLM_PARSE_ERROR]: 'Die KI-Antwort konnte nicht verarbeitet werden. Bitte versuche es erneut.',
    [ErrorCode.LLM_INVALID_RESPONSE]: 'Die KI hat eine ungültige Antwort geliefert. Bitte versuche es erneut.',

    // AI prompt guardrails (issue #520)
    [ErrorCode.AI_PROMPT_TOO_LONG]: 'Deine Eingabe für die KI ist zu lang. Bitte kürze den Text und versuche es erneut.',

    // File upload errors
    [ErrorCode.FILE_TOO_LARGE]: 'Die Datei ist zu groß. Maximal 10 MB sind erlaubt.',
    [ErrorCode.FILE_INVALID_TYPE]: 'Ungültiger Dateityp. Nur PDF-, Word- und Textdateien sind erlaubt.',

    // Password errors
    [ErrorCode.PASSWORD_INCORRECT]: 'Das aktuelle Passwort ist falsch. Bitte versuche es erneut.',
    [ErrorCode.PASSWORD_SAME_AS_CURRENT]: 'Das neue Passwort muss sich vom aktuellen Passwort unterscheiden.',
    [ErrorCode.PASSWORD_CHANGE_OAUTH]: 'Passwort kann für Konten mit externem Login (z.B. Google) nicht geändert werden.',

    // Rate limiting
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Zu viele Aktionen. Bitte warte einen Moment und versuche es erneut.',

    // Client-side errors
    [ErrorCode.NETWORK_ERROR]: 'Keine Internetverbindung. Bitte überprüfe deine Verbindung.',

    // Generic errors
    [ErrorCode.INTERNAL_SERVER_ERROR]: 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.',
    [ErrorCode.VALIDATION_ERROR]: 'Ungültige Eingabe. Bitte überprüfe deine Daten.',
    [ErrorCode.NOT_FOUND]: 'Der angeforderte Inhalt wurde nicht gefunden.',
    [ErrorCode.FORBIDDEN]: 'Zugriff verweigert. Du hast keine Berechtigung für diese Aktion.',

    // CSRF errors (from backend)
    EBADCSRFTOKEN: 'Die Sicherheitsüberprüfung ist fehlgeschlagen. Bitte lade die Seite neu und versuche es erneut.',
  },
  en: {
    // Authentication errors
    [ErrorCode.INVALID_CREDENTIALS]: 'Incorrect email or password. Please try again.',
    [ErrorCode.UNAUTHORIZED]: 'Your session has expired. Please sign in again.',
    [ErrorCode.USER_EXISTS]: 'An account with this email already exists. Please sign in.',
    [ErrorCode.USER_NOT_FOUND]: 'User not found. Please sign in again.',
    [ErrorCode.REFRESH_TOKEN_INVALID]: 'Your session has expired. Please sign in again.',
    [ErrorCode.REFRESH_TOKEN_NOT_FOUND]: 'Your session has expired. Please sign in again.',
    [ErrorCode.INVALID_TOKEN_TYPE]: 'Your login is invalid. Please sign in again.',
    [ErrorCode.SESSION_EXPIRED]: 'Your session has expired. Please sign in again.',

    // Profile errors
    [ErrorCode.PROFILE_NOT_FOUND]: 'Please create your profile in the profile section first.',
    [ErrorCode.PROFILE_INCOMPLETE]: 'Please complete your profile before continuing.',
    [ErrorCode.PROFILE_UPDATE_FAILED]: 'Your profile could not be updated. Please try again.',

    // Job posting errors
    [ErrorCode.JOB_POSTING_NOT_FOUND]: 'Job posting not found. It may have been deleted.',
    [ErrorCode.JOB_POSTING_PARSE_FAILED]: 'The job posting could not be processed. Please check the format.',

    // Application errors
    [ErrorCode.APPLICATION_NOT_FOUND]: 'Application not found. It may have been deleted.',
    [ErrorCode.APPLICATION_DUPLICATE]: 'You have already created an application for this job. Please edit the existing application or delete it first.',
    [ErrorCode.APPLICATION_GENERATING]: 'Your documents are currently being generated. Please wait a moment.',
    [ErrorCode.APPLICATION_GENERATION_FAILED]: 'The application could not be generated. Please try again.',
    [ErrorCode.APPLICATION_NOT_FAILED]: 'Only failed applications can be regenerated.',
    [ErrorCode.APPLICATION_NO_RESUME]: 'Please save your résumé first.',
    [ErrorCode.APPLICATION_NO_JOB]: 'No job posting linked. Please select a job.',
    [ErrorCode.APPLICATION_RESUME_CORRUPTED]: 'The stored résumé is corrupted. Please update it.',

    // LLM errors
    [ErrorCode.LLM_TIMEOUT]: 'The AI generation is taking longer than expected. Your application is being generated in the background.',
    [ErrorCode.LLM_PARSE_ERROR]: 'The AI response could not be processed. Please try again.',
    [ErrorCode.LLM_INVALID_RESPONSE]: 'The AI returned an invalid response. Please try again.',

    // AI prompt guardrails (issue #520)
    [ErrorCode.AI_PROMPT_TOO_LONG]: 'Your input for the AI is too long. Please shorten the text and try again.',

    // File upload errors
    [ErrorCode.FILE_TOO_LARGE]: 'The file is too large. The maximum size is 10 MB.',
    [ErrorCode.FILE_INVALID_TYPE]: 'Invalid file type. Only PDF, Word, and text files are allowed.',

    // Password errors
    [ErrorCode.PASSWORD_INCORRECT]: 'The current password is incorrect. Please try again.',
    [ErrorCode.PASSWORD_SAME_AS_CURRENT]: 'The new password must be different from the current password.',
    [ErrorCode.PASSWORD_CHANGE_OAUTH]: 'The password cannot be changed for accounts using an external login (e.g. Google).',

    // Rate limiting
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many actions. Please wait a moment and try again.',

    // Client-side errors
    [ErrorCode.NETWORK_ERROR]: 'No internet connection. Please check your connection.',

    // Generic errors
    [ErrorCode.INTERNAL_SERVER_ERROR]: 'Something went wrong. Please try again later.',
    [ErrorCode.VALIDATION_ERROR]: 'Invalid input. Please check your data.',
    [ErrorCode.NOT_FOUND]: 'The requested content was not found.',
    [ErrorCode.FORBIDDEN]: 'Access denied. You do not have permission to perform this action.',

    // CSRF errors (from backend)
    EBADCSRFTOKEN: 'The security check failed. Please reload the page and try again.',
  },
  fr: {
    [ErrorCode.INVALID_CREDENTIALS]: 'E-mail ou mot de passe incorrect. Veuillez réessayer.',
    [ErrorCode.UNAUTHORIZED]: 'Votre session a expiré. Veuillez vous reconnecter.',
    [ErrorCode.USER_EXISTS]: 'Un compte avec cet e-mail existe déjà. Veuillez vous connecter.',
    [ErrorCode.USER_NOT_FOUND]: 'Utilisateur introuvable. Veuillez vous reconnecter.',
    [ErrorCode.REFRESH_TOKEN_INVALID]: 'Votre session a expiré. Veuillez vous reconnecter.',
    [ErrorCode.REFRESH_TOKEN_NOT_FOUND]: 'Votre session a expiré. Veuillez vous reconnecter.',
    [ErrorCode.INVALID_TOKEN_TYPE]: 'Votre connexion est invalide. Veuillez vous reconnecter.',
    [ErrorCode.SESSION_EXPIRED]: 'Votre session a expiré. Veuillez vous reconnecter.',

    [ErrorCode.PROFILE_NOT_FOUND]: 'Veuillez d’abord créer votre profil dans la section Profil.',
    [ErrorCode.PROFILE_INCOMPLETE]: 'Veuillez compléter votre profil avant de continuer.',
    [ErrorCode.PROFILE_UPDATE_FAILED]: 'Votre profil n’a pas pu être mis à jour. Veuillez réessayer.',

    [ErrorCode.JOB_POSTING_NOT_FOUND]: 'Offre d’emploi introuvable. Elle a peut-être été supprimée.',
    [ErrorCode.JOB_POSTING_PARSE_FAILED]: 'L’offre d’emploi n’a pas pu être traitée. Veuillez vérifier le format.',

    [ErrorCode.APPLICATION_NOT_FOUND]: 'Candidature introuvable. Elle a peut-être été supprimée.',
    [ErrorCode.APPLICATION_DUPLICATE]: 'Vous avez déjà créé une candidature pour ce poste. Veuillez modifier la candidature existante ou la supprimer d’abord.',
    [ErrorCode.APPLICATION_GENERATING]: 'Vos documents sont en cours de génération. Veuillez patienter un instant.',
    [ErrorCode.APPLICATION_GENERATION_FAILED]: 'La candidature n’a pas pu être générée. Veuillez réessayer.',
    [ErrorCode.APPLICATION_NOT_FAILED]: 'Seules les candidatures échouées peuvent être régénérées.',
    [ErrorCode.APPLICATION_NO_RESUME]: 'Veuillez d’abord enregistrer votre CV.',
    [ErrorCode.APPLICATION_NO_JOB]: 'Aucune offre d’emploi liée. Veuillez sélectionner un poste.',
    [ErrorCode.APPLICATION_RESUME_CORRUPTED]: 'Le CV enregistré est corrompu. Veuillez le mettre à jour.',

    [ErrorCode.LLM_TIMEOUT]: 'La génération par l’IA prend plus de temps que prévu. Votre candidature est créée en arrière-plan.',
    [ErrorCode.LLM_PARSE_ERROR]: 'La réponse de l’IA n’a pas pu être traitée. Veuillez réessayer.',
    [ErrorCode.LLM_INVALID_RESPONSE]: 'L’IA a renvoyé une réponse invalide. Veuillez réessayer.',

    [ErrorCode.AI_PROMPT_TOO_LONG]: 'Votre saisie pour l’IA est trop longue. Veuillez raccourcir le texte et réessayer.',

    [ErrorCode.FILE_TOO_LARGE]: 'Le fichier est trop volumineux. La taille maximale est de 10 Mo.',
    [ErrorCode.FILE_INVALID_TYPE]: 'Type de fichier invalide. Seuls les fichiers PDF, Word et texte sont autorisés.',

    [ErrorCode.PASSWORD_INCORRECT]: 'Le mot de passe actuel est incorrect. Veuillez réessayer.',
    [ErrorCode.PASSWORD_SAME_AS_CURRENT]: 'Le nouveau mot de passe doit être différent du mot de passe actuel.',
    [ErrorCode.PASSWORD_CHANGE_OAUTH]: 'Le mot de passe ne peut pas être modifié pour les comptes utilisant une connexion externe (p. ex. Google).',

    [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Trop d’actions. Veuillez patienter un instant et réessayer.',

    [ErrorCode.NETWORK_ERROR]: 'Pas de connexion Internet. Veuillez vérifier votre connexion.',

    [ErrorCode.INTERNAL_SERVER_ERROR]: 'Une erreur est survenue. Veuillez réessayer plus tard.',
    [ErrorCode.VALIDATION_ERROR]: 'Saisie invalide. Veuillez vérifier vos données.',
    [ErrorCode.NOT_FOUND]: 'Le contenu demandé est introuvable.',
    [ErrorCode.FORBIDDEN]: 'Accès refusé. Vous n’avez pas l’autorisation d’effectuer cette action.',

    EBADCSRFTOKEN: 'La vérification de sécurité a échoué. Veuillez recharger la page et réessayer.',
  },
  es: {
    [ErrorCode.INVALID_CREDENTIALS]: 'Correo electrónico o contraseña incorrectos. Inténtalo de nuevo.',
    [ErrorCode.UNAUTHORIZED]: 'Tu sesión ha caducado. Inicia sesión de nuevo.',
    [ErrorCode.USER_EXISTS]: 'Ya existe una cuenta con este correo electrónico. Inicia sesión.',
    [ErrorCode.USER_NOT_FOUND]: 'Usuario no encontrado. Inicia sesión de nuevo.',
    [ErrorCode.REFRESH_TOKEN_INVALID]: 'Tu sesión ha caducado. Inicia sesión de nuevo.',
    [ErrorCode.REFRESH_TOKEN_NOT_FOUND]: 'Tu sesión ha caducado. Inicia sesión de nuevo.',
    [ErrorCode.INVALID_TOKEN_TYPE]: 'Tu inicio de sesión no es válido. Inicia sesión de nuevo.',
    [ErrorCode.SESSION_EXPIRED]: 'Tu sesión ha caducado. Inicia sesión de nuevo.',

    [ErrorCode.PROFILE_NOT_FOUND]: 'Primero crea tu perfil en la sección de perfil.',
    [ErrorCode.PROFILE_INCOMPLETE]: 'Completa tu perfil antes de continuar.',
    [ErrorCode.PROFILE_UPDATE_FAILED]: 'No se pudo actualizar tu perfil. Inténtalo de nuevo.',

    [ErrorCode.JOB_POSTING_NOT_FOUND]: 'Oferta de empleo no encontrada. Es posible que haya sido eliminada.',
    [ErrorCode.JOB_POSTING_PARSE_FAILED]: 'No se pudo procesar la oferta de empleo. Comprueba el formato.',

    [ErrorCode.APPLICATION_NOT_FOUND]: 'Candidatura no encontrada. Es posible que haya sido eliminada.',
    [ErrorCode.APPLICATION_DUPLICATE]: 'Ya has creado una candidatura para este puesto. Edita la candidatura existente o elimínala primero.',
    [ErrorCode.APPLICATION_GENERATING]: 'Tus documentos se están generando. Espera un momento.',
    [ErrorCode.APPLICATION_GENERATION_FAILED]: 'No se pudo generar la candidatura. Inténtalo de nuevo.',
    [ErrorCode.APPLICATION_NOT_FAILED]: 'Solo se pueden regenerar las candidaturas fallidas.',
    [ErrorCode.APPLICATION_NO_RESUME]: 'Primero guarda tu currículum.',
    [ErrorCode.APPLICATION_NO_JOB]: 'No hay ninguna oferta de empleo vinculada. Selecciona un puesto.',
    [ErrorCode.APPLICATION_RESUME_CORRUPTED]: 'El currículum guardado está dañado. Actualízalo.',

    [ErrorCode.LLM_TIMEOUT]: 'La generación con IA está tardando más de lo esperado. Tu candidatura se está creando en segundo plano.',
    [ErrorCode.LLM_PARSE_ERROR]: 'No se pudo procesar la respuesta de la IA. Inténtalo de nuevo.',
    [ErrorCode.LLM_INVALID_RESPONSE]: 'La IA devolvió una respuesta no válida. Inténtalo de nuevo.',

    [ErrorCode.AI_PROMPT_TOO_LONG]: 'Tu entrada para la IA es demasiado larga. Acorta el texto e inténtalo de nuevo.',

    [ErrorCode.FILE_TOO_LARGE]: 'El archivo es demasiado grande. El tamaño máximo es de 10 MB.',
    [ErrorCode.FILE_INVALID_TYPE]: 'Tipo de archivo no válido. Solo se permiten archivos PDF, Word y de texto.',

    [ErrorCode.PASSWORD_INCORRECT]: 'La contraseña actual es incorrecta. Inténtalo de nuevo.',
    [ErrorCode.PASSWORD_SAME_AS_CURRENT]: 'La nueva contraseña debe ser diferente de la contraseña actual.',
    [ErrorCode.PASSWORD_CHANGE_OAUTH]: 'La contraseña no se puede cambiar en cuentas con inicio de sesión externo (p. ej., Google).',

    [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Demasiadas acciones. Espera un momento e inténtalo de nuevo.',

    [ErrorCode.NETWORK_ERROR]: 'Sin conexión a Internet. Comprueba tu conexión.',

    [ErrorCode.INTERNAL_SERVER_ERROR]: 'Se ha producido un error. Inténtalo de nuevo más tarde.',
    [ErrorCode.VALIDATION_ERROR]: 'Entrada no válida. Comprueba tus datos.',
    [ErrorCode.NOT_FOUND]: 'No se encontró el contenido solicitado.',
    [ErrorCode.FORBIDDEN]: 'Acceso denegado. No tienes permiso para realizar esta acción.',

    EBADCSRFTOKEN: 'La comprobación de seguridad ha fallado. Recarga la página e inténtalo de nuevo.',
  },
  pt: {
    [ErrorCode.INVALID_CREDENTIALS]: 'E-mail ou palavra-passe incorretos. Tenta novamente.',
    [ErrorCode.UNAUTHORIZED]: 'A tua sessão expirou. Inicia sessão novamente.',
    [ErrorCode.USER_EXISTS]: 'Já existe uma conta com este e-mail. Inicia sessão.',
    [ErrorCode.USER_NOT_FOUND]: 'Utilizador não encontrado. Inicia sessão novamente.',
    [ErrorCode.REFRESH_TOKEN_INVALID]: 'A tua sessão expirou. Inicia sessão novamente.',
    [ErrorCode.REFRESH_TOKEN_NOT_FOUND]: 'A tua sessão expirou. Inicia sessão novamente.',
    [ErrorCode.INVALID_TOKEN_TYPE]: 'O teu início de sessão é inválido. Inicia sessão novamente.',
    [ErrorCode.SESSION_EXPIRED]: 'A tua sessão expirou. Inicia sessão novamente.',

    [ErrorCode.PROFILE_NOT_FOUND]: 'Cria primeiro o teu perfil na secção de perfil.',
    [ErrorCode.PROFILE_INCOMPLETE]: 'Completa o teu perfil antes de continuar.',
    [ErrorCode.PROFILE_UPDATE_FAILED]: 'Não foi possível atualizar o teu perfil. Tenta novamente.',

    [ErrorCode.JOB_POSTING_NOT_FOUND]: 'Oferta de emprego não encontrada. Pode ter sido eliminada.',
    [ErrorCode.JOB_POSTING_PARSE_FAILED]: 'Não foi possível processar a oferta de emprego. Verifica o formato.',

    [ErrorCode.APPLICATION_NOT_FOUND]: 'Candidatura não encontrada. Pode ter sido eliminada.',
    [ErrorCode.APPLICATION_DUPLICATE]: 'Já criaste uma candidatura para esta vaga. Edita a candidatura existente ou elimina-a primeiro.',
    [ErrorCode.APPLICATION_GENERATING]: 'Os teus documentos estão a ser gerados. Aguarda um momento.',
    [ErrorCode.APPLICATION_GENERATION_FAILED]: 'Não foi possível gerar a candidatura. Tenta novamente.',
    [ErrorCode.APPLICATION_NOT_FAILED]: 'Apenas candidaturas falhadas podem ser geradas novamente.',
    [ErrorCode.APPLICATION_NO_RESUME]: 'Guarda primeiro o teu currículo.',
    [ErrorCode.APPLICATION_NO_JOB]: 'Nenhuma oferta de emprego associada. Seleciona uma vaga.',
    [ErrorCode.APPLICATION_RESUME_CORRUPTED]: 'O currículo guardado está corrompido. Atualiza-o.',

    [ErrorCode.LLM_TIMEOUT]: 'A geração por IA está a demorar mais do que o esperado. A tua candidatura está a ser criada em segundo plano.',
    [ErrorCode.LLM_PARSE_ERROR]: 'Não foi possível processar a resposta da IA. Tenta novamente.',
    [ErrorCode.LLM_INVALID_RESPONSE]: 'A IA devolveu uma resposta inválida. Tenta novamente.',

    [ErrorCode.AI_PROMPT_TOO_LONG]: 'A tua entrada para a IA é demasiado longa. Encurta o texto e tenta novamente.',

    [ErrorCode.FILE_TOO_LARGE]: 'O ficheiro é demasiado grande. O tamanho máximo é de 10 MB.',
    [ErrorCode.FILE_INVALID_TYPE]: 'Tipo de ficheiro inválido. Apenas são permitidos ficheiros PDF, Word e de texto.',

    [ErrorCode.PASSWORD_INCORRECT]: 'A palavra-passe atual está incorreta. Tenta novamente.',
    [ErrorCode.PASSWORD_SAME_AS_CURRENT]: 'A nova palavra-passe tem de ser diferente da palavra-passe atual.',
    [ErrorCode.PASSWORD_CHANGE_OAUTH]: 'A palavra-passe não pode ser alterada em contas com início de sessão externo (p. ex., Google).',

    [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Demasiadas ações. Aguarda um momento e tenta novamente.',

    [ErrorCode.NETWORK_ERROR]: 'Sem ligação à Internet. Verifica a tua ligação.',

    [ErrorCode.INTERNAL_SERVER_ERROR]: 'Ocorreu um erro. Tenta novamente mais tarde.',
    [ErrorCode.VALIDATION_ERROR]: 'Entrada inválida. Verifica os teus dados.',
    [ErrorCode.NOT_FOUND]: 'O conteúdo solicitado não foi encontrado.',
    [ErrorCode.FORBIDDEN]: 'Acesso negado. Não tens permissão para realizar esta ação.',

    EBADCSRFTOKEN: 'A verificação de segurança falhou. Recarrega a página e tenta novamente.',
  },
  it: {
    [ErrorCode.INVALID_CREDENTIALS]: 'E-mail o password errati. Riprova.',
    [ErrorCode.UNAUTHORIZED]: 'La tua sessione è scaduta. Accedi di nuovo.',
    [ErrorCode.USER_EXISTS]: 'Esiste già un account con questa e-mail. Accedi.',
    [ErrorCode.USER_NOT_FOUND]: 'Utente non trovato. Accedi di nuovo.',
    [ErrorCode.REFRESH_TOKEN_INVALID]: 'La tua sessione è scaduta. Accedi di nuovo.',
    [ErrorCode.REFRESH_TOKEN_NOT_FOUND]: 'La tua sessione è scaduta. Accedi di nuovo.',
    [ErrorCode.INVALID_TOKEN_TYPE]: 'Il tuo accesso non è valido. Accedi di nuovo.',
    [ErrorCode.SESSION_EXPIRED]: 'La tua sessione è scaduta. Accedi di nuovo.',

    [ErrorCode.PROFILE_NOT_FOUND]: 'Crea prima il tuo profilo nella sezione profilo.',
    [ErrorCode.PROFILE_INCOMPLETE]: 'Completa il tuo profilo prima di continuare.',
    [ErrorCode.PROFILE_UPDATE_FAILED]: 'Impossibile aggiornare il tuo profilo. Riprova.',

    [ErrorCode.JOB_POSTING_NOT_FOUND]: 'Annuncio di lavoro non trovato. Potrebbe essere stato eliminato.',
    [ErrorCode.JOB_POSTING_PARSE_FAILED]: 'Impossibile elaborare l’annuncio di lavoro. Controlla il formato.',

    [ErrorCode.APPLICATION_NOT_FOUND]: 'Candidatura non trovata. Potrebbe essere stata eliminata.',
    [ErrorCode.APPLICATION_DUPLICATE]: 'Hai già creato una candidatura per questa posizione. Modifica la candidatura esistente o eliminala prima.',
    [ErrorCode.APPLICATION_GENERATING]: 'I tuoi documenti sono in fase di generazione. Attendi un momento.',
    [ErrorCode.APPLICATION_GENERATION_FAILED]: 'Impossibile generare la candidatura. Riprova.',
    [ErrorCode.APPLICATION_NOT_FAILED]: 'Solo le candidature non riuscite possono essere rigenerate.',
    [ErrorCode.APPLICATION_NO_RESUME]: 'Salva prima il tuo curriculum.',
    [ErrorCode.APPLICATION_NO_JOB]: 'Nessun annuncio di lavoro collegato. Seleziona una posizione.',
    [ErrorCode.APPLICATION_RESUME_CORRUPTED]: 'Il curriculum salvato è danneggiato. Aggiornalo.',

    [ErrorCode.LLM_TIMEOUT]: 'La generazione con l’IA sta richiedendo più tempo del previsto. La tua candidatura viene creata in background.',
    [ErrorCode.LLM_PARSE_ERROR]: 'Impossibile elaborare la risposta dell’IA. Riprova.',
    [ErrorCode.LLM_INVALID_RESPONSE]: 'L’IA ha restituito una risposta non valida. Riprova.',

    [ErrorCode.AI_PROMPT_TOO_LONG]: 'Il tuo input per l’IA è troppo lungo. Accorcia il testo e riprova.',

    [ErrorCode.FILE_TOO_LARGE]: 'Il file è troppo grande. La dimensione massima è di 10 MB.',
    [ErrorCode.FILE_INVALID_TYPE]: 'Tipo di file non valido. Sono consentiti solo file PDF, Word e di testo.',

    [ErrorCode.PASSWORD_INCORRECT]: 'La password attuale è errata. Riprova.',
    [ErrorCode.PASSWORD_SAME_AS_CURRENT]: 'La nuova password deve essere diversa da quella attuale.',
    [ErrorCode.PASSWORD_CHANGE_OAUTH]: 'La password non può essere modificata per gli account con accesso esterno (ad es. Google).',

    [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Troppe azioni. Attendi un momento e riprova.',

    [ErrorCode.NETWORK_ERROR]: 'Nessuna connessione a Internet. Controlla la tua connessione.',

    [ErrorCode.INTERNAL_SERVER_ERROR]: 'Si è verificato un errore. Riprova più tardi.',
    [ErrorCode.VALIDATION_ERROR]: 'Input non valido. Controlla i tuoi dati.',
    [ErrorCode.NOT_FOUND]: 'Il contenuto richiesto non è stato trovato.',
    [ErrorCode.FORBIDDEN]: 'Accesso negato. Non hai l’autorizzazione per eseguire questa azione.',

    EBADCSRFTOKEN: 'La verifica di sicurezza non è riuscita. Ricarica la pagina e riprova.',
  },
};

/**
 * Get user-friendly error message for a given error code
 * Falls back to a generic message if code is not found
 *
 * @param code - Error code from backend or ErrorCode enum
 * @param fallbackMessage - Optional custom fallback message
 * @returns User-friendly error message in the active UI language
 */
export function getErrorMessage(
  code?: string | null,
  fallbackMessage?: string
): string {
  const messages = ERROR_MESSAGES[getActiveLocale()];

  if (!code) {
    return fallbackMessage || messages[ErrorCode.INTERNAL_SERVER_ERROR];
  }

  return messages[code] || fallbackMessage || messages[ErrorCode.INTERNAL_SERVER_ERROR];
}

/**
 * Format validation errors into a user-friendly message
 * 
 * @param errors - Validation error array from backend
 * @returns Formatted error message
 */
export function formatValidationErrors(errors: string[] | string): string {
  if (typeof errors === 'string') {
    return errors;
  }
  
  if (Array.isArray(errors) && errors.length > 0) {
    // Join multiple validation errors with line breaks
    return errors.join('\n');
  }
  
  return ERROR_MESSAGES[getActiveLocale()][ErrorCode.VALIDATION_ERROR];
}
