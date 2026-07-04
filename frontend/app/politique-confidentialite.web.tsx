import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function PolitiqueConfidentialite() {
  const router = useRouter();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

      {/* Nav */}
      <View style={styles.nav}>
        <Text style={styles.navLogo}>Ma Bibliothèque</Text>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.replace('/')}>
          <Text style={styles.navBtnText}>← Accueil</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.container}>
        <Text style={styles.pageTitle}>Politique de confidentialité</Text>
        <Text style={styles.updated}>Dernière mise à jour : juillet 2026</Text>

        <Section title="1. Qui sommes-nous ?">
          <P>Ma Bibliothèque est une application mobile de gestion de bibliothèque personnelle développée et exploitée par Quentin Diaz de Cerio.</P>
          <P>Contact : quentin.ddc@hotmail.fr</P>
          <P>Pour toute question relative à vos données personnelles ou pour exercer vos droits, contactez-nous à cette adresse.</P>
        </Section>

        <Section title="2. Données collectées">
          <H3>2.1 Données de compte</H3>
          <P>Lors de votre inscription, nous collectons :</P>
          <TableSimple rows={[
            ['Adresse e-mail', 'Identifiant de connexion, vérification du compte, communications liées au service'],
            ['Nom d\'utilisateur', 'Affichage dans l\'application'],
            ['Mot de passe', 'Authentification — stocké sous forme de hash bcrypt (jamais en clair)'],
          ]} headers={['Donnée', 'Utilisation']} />

          <H3>2.2 Données de bibliothèque</H3>
          <P>Les données que vous saisissez volontairement dans l'application :</P>
          <BulletList items={[
            'Livres : titre, sous-titre, ISBN, auteurs, éditeur, date de publication, nombre de pages, statut de lecture, date de lecture, note (0–5 étoiles), notes personnelles',
            'Couvertures de livres : images uploadées ou récupérées automatiquement depuis Google Books / OpenLibrary, redimensionnées et stockées sur nos serveurs (600×900 px max, format JPEG)',
            'Prêts et emprunts : contacts, dates de prêt, dates de retour prévues et effectives, notes',
            'Contacts : nom, e-mail (facultatif), téléphone (facultatif), notes personnelles',
          ]} />

          <H3>2.3 Données sociales</H3>
          <P>Si vous utilisez les fonctionnalités sociales :</P>
          <BulletList items={[
            'Invitations de contact (expéditeur, destinataire, message facultatif, statut, dates)',
            'Demandes de prêt entre membres (demandeur, prêteur, livre, message, dates)',
            'Préférence de partage de bibliothèque avec vos contacts',
          ]} />

          <H3>2.4 Données techniques</H3>
          <P>Collectées automatiquement lors de l'utilisation :</P>
          <BulletList items={[
            'Adresse IP : enregistrée temporairement lors des tentatives de connexion, d\'inscription, et de réinitialisation de mot de passe, à des fins de protection contre les abus (supprimée automatiquement après 15 minutes)',
            'Tokens JWT : jetons d\'authentification stockés localement sur votre appareil (accès : 30 minutes ou 30 jours avec "se souvenir de moi" ; rafraîchissement : 1 jour ou 60 jours)',
            'Tokens de vérification e-mail : valables 24 heures, à usage unique',
            'Tokens de réinitialisation de mot de passe : valables 15 minutes, à usage unique',
          ]} />

          <H3>2.5 Notifications push</H3>
          <P>Si vous activez les notifications :</P>
          <BulletList items={[
            'Un token Expo Push propre à votre appareil est collecté et stocké sur nos serveurs',
            'Vos préférences de notification (par type d\'événement) sont enregistrées',
            'Vous pouvez désactiver les notifications à tout moment depuis les paramètres de l\'application ou de votre appareil',
          ]} />
        </Section>

        <Section title="3. Base légale du traitement">
          <TableSimple rows={[
            ['Création et gestion du compte', 'Exécution du contrat (CGU)'],
            ['Authentification et sécurité', 'Intérêt légitime (protection contre la fraude)'],
            ['Envoi d\'e-mails transactionnels', 'Exécution du contrat'],
            ['Notifications push', 'Consentement explicite'],
            ['Journaux d\'accès temporaires (rate limiting)', 'Intérêt légitime (sécurité)'],
            ['Données de bibliothèque et prêts', 'Exécution du contrat'],
          ]} headers={['Traitement', 'Base légale']} />
        </Section>

        <Section title="4. Durée de conservation">
          <TableSimple rows={[
            ['Données de compte et bibliothèque', 'Jusqu\'à suppression du compte'],
            ['Adresses IP (rate limiting)', '15 minutes'],
            ['Tokens de vérification e-mail', '24 heures'],
            ['Tokens de réinitialisation de mot de passe', '15 minutes'],
            ['Tokens push', 'Jusqu\'à désinscription ou suppression du compte'],
            ['Journaux d\'audit (actions modération)', 'Durée indéterminée (obligation de traçabilité)'],
          ]} headers={['Donnée', 'Durée']} />
        </Section>

        <Section title="5. Sécurité des données">
          <BulletList items={[
            'Mots de passe : stockés exclusivement sous forme de hash bcrypt — il nous est techniquement impossible de connaître votre mot de passe',
            'Communications : chiffrées via HTTPS (TLS) en production',
            'Tokens : générés cryptographiquement',
            'Limitation des accès : rate limiting sur tous les endpoints sensibles',
            'Headers de sécurité HTTP : CSP, X-Frame-Options, HSTS activés en production',
          ]} />
        </Section>

        <Section title="6. Partage des données avec des tiers">
          <P>Nous ne vendons ni ne louons vos données personnelles. Certains prestataires techniques accèdent aux données dans le cadre de la fourniture du service :</P>
          <TableSimple rows={[
            ['Resend (resend.com)', 'Adresse e-mail, nom d\'utilisateur', 'Envoi des e-mails transactionnels'],
            ['Expo (expo.dev)', 'Token push de l\'appareil', 'Envoi des notifications push'],
            ['Google Books API', 'ISBN ou titre du livre', 'Récupération des métadonnées de livres'],
            ['OpenLibrary (openlibrary.org)', 'ISBN ou titre du livre', 'Récupération des métadonnées de livres'],
          ]} headers={['Prestataire', 'Données transmises', 'Finalité']} />
          <P>Ces prestataires traitent les données uniquement pour les finalités décrites et sont soumis à leurs propres politiques de confidentialité.</P>

          <H3>6.1 Liens affiliés Amazon</H3>
          <P>Certaines fiches livres affichent un bouton "Voir sur Amazon". Ces liens contiennent un identifiant affilié Amazon Associates (mabibliothe08-21). Lorsque vous cliquez sur ce lien :</P>
          <BulletList items={[
            'Aucune donnée personnelle vous concernant n\'est transmise à Amazon par notre application',
            'Amazon peut déposer des cookies sur votre appareil conformément à sa propre politique de confidentialité',
            'Si vous effectuez un achat via ce lien, nous percevons une commission d\'affiliation',
          ]} />
          <P style={styles.italic}>En tant que Partenaire Amazon, nous réalisons un bénéfice sur les achats remplissant les conditions requises.</P>
        </Section>

        <Section title="7. Vos droits (RGPD)">
          <P>Conformément au Règlement Général sur la Protection des Données (UE 2016/679), vous disposez des droits suivants :</P>
          <BulletList items={[
            'Droit d\'accès : consulter toutes vos données via votre profil dans l\'application',
            'Droit de rectification : modifier votre e-mail ou nom d\'utilisateur depuis les paramètres',
            'Droit à l\'effacement : supprimer votre compte et toutes vos données depuis les paramètres (suppression immédiate et définitive)',
            'Droit à la portabilité : exporter votre bibliothèque au format CSV depuis l\'application',
            'Droit d\'opposition aux notifications : désactiver chaque type de notification push indépendamment',
            'Droit de réclamation : introduire une réclamation auprès de la CNIL (cnil.fr)',
          ]} />
          <P>Pour exercer vos droits, contactez-nous à quentin.ddc@hotmail.fr. Nous répondrons dans un délai de 30 jours.</P>

          <H3>Ce qui est supprimé lors de la suppression de compte</H3>
          <BulletList items={[
            'Votre profil (e-mail, nom d\'utilisateur, mot de passe hashé)',
            'Tous vos livres et couvertures associées',
            'Tous vos prêts et emprunts',
            'Tous vos contacts',
            'Toutes vos demandes de prêt et invitations',
            'Vos tokens push',
          ]} />
        </Section>

        <Section title="8. Permissions de l'application">
          <TableSimple rows={[
            ['Caméra', 'Scanner les codes-barres des livres'],
            ['Photos / Galerie', 'Choisir une image de couverture pour un livre'],
            ['Notifications', 'Recevoir des alertes pour les invitations, demandes de prêt, etc.'],
            ['Calendrier', 'Créer des rappels de retour de livres (facultatif)'],
          ]} headers={['Permission', 'Utilisation']} />
          <P>Chaque permission n'est demandée que lors de la première utilisation de la fonctionnalité concernée. Vous pouvez révoquer ces permissions à tout moment depuis les paramètres de votre appareil.</P>
        </Section>

        <Section title="9. Données des mineurs">
          <P>L'application est destinée à un public adulte. Nous ne collectons pas sciemment de données personnelles de personnes de moins de 16 ans. Si vous pensez qu'un mineur a créé un compte, contactez-nous pour que nous le supprimions.</P>
        </Section>

        <Section title="10. Modifications de cette politique">
          <P>En cas de modification substantielle de cette politique, nous vous en informerons via l'application ou par e-mail. La date de dernière mise à jour figure en haut de ce document.</P>
        </Section>

        <Section title="11. Contact et réclamations">
          <P>Responsable du traitement : Quentin Diaz de Cerio — quentin.ddc@hotmail.fr</P>
          <P>Autorité de contrôle : Commission Nationale de l'Informatique et des Libertés (CNIL), 3 place de Fontenoy, 75007 Paris — www.cnil.fr</P>
        </Section>
      </View>

      {/* Footer */}
      {/* @ts-ignore */}
      <View role="contentinfo" style={styles.footer}>
        <View style={styles.footerInner}>
          <Text style={styles.footerLogo}>Ma Bibliothèque</Text>
          <Text style={styles.footerText}>© 2026 — Application gratuite, vos données vous appartiennent.</Text>
        </View>
      </View>

    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.h2}>{title}</Text>
      {children}
    </View>
  );
}

function H3({ children }: { children: string }) {
  return <Text style={styles.h3}>{children}</Text>;
}

function P({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.p, style]}>{children}</Text>;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <View style={styles.bulletList}>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function TableSimple({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <View style={styles.table}>
      <View style={[styles.tableRow, styles.tableHeader]}>
        {headers.map((h, i) => (
          <Text key={i} style={[styles.tableCell, styles.tableCellHeader, { flex: i === 0 ? 1 : 2 }]}>{h}</Text>
        ))}
      </View>
      {rows.map((row, i) => (
        <View key={i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
          {row.map((cell, j) => (
            <Text key={j} style={[styles.tableCell, { flex: j === 0 ? 1 : 2 }]}>{cell}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const ACCENT = '#8B2020';
const BG = '#fdfcfb';
const BG_ALT = '#f5f3ef';

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: BG },
  scrollContent: { flexGrow: 1 },

  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 18,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: '#ece9e4',
  },
  navLogo: { fontSize: 18, fontWeight: '700', color: ACCENT, letterSpacing: 0.3 },
  navBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: ACCENT,
  },
  navBtnText: { color: ACCENT, fontWeight: '600', fontSize: 14 },

  container: { maxWidth: 800, width: '100%', alignSelf: 'center', paddingHorizontal: 32, paddingVertical: 48 },

  pageTitle: { fontSize: 34, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  updated: { fontSize: 13, color: '#888', marginBottom: 40 },

  section: { marginBottom: 40 },
  h2: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 14, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#ece9e4' },
  h3: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginTop: 16, marginBottom: 8 },
  p: { fontSize: 15, color: '#444', lineHeight: 26, marginBottom: 10 },
  italic: { fontStyle: 'italic' },

  bulletList: { marginBottom: 10 },
  bulletItem: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  bullet: { fontSize: 15, color: ACCENT, marginTop: 2 },
  bulletText: { flex: 1, fontSize: 15, color: '#444', lineHeight: 24 },

  table: { borderWidth: 1, borderColor: '#ece9e4', borderRadius: 8, overflow: 'hidden', marginBottom: 12 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ece9e4' },
  tableRowAlt: { backgroundColor: BG_ALT },
  tableHeader: { backgroundColor: '#f0ece7' },
  tableCell: { fontSize: 14, color: '#444', padding: 12, lineHeight: 20 },
  tableCellHeader: { fontWeight: '700', color: '#1a1a1a' },

  footer: { backgroundColor: '#1a1a1a', paddingVertical: 40 },
  footerInner: { maxWidth: 960, width: '100%', alignSelf: 'center', paddingHorizontal: 32 },
  footerLogo: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 8 },
  footerText: { fontSize: 13, color: '#888' },
});
