import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function CGU() {
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
        <Text style={styles.pageTitle}>Conditions Générales d'Utilisation</Text>
        <Text style={styles.updated}>Dernière mise à jour : juillet 2026</Text>

        <Section title="1. Présentation du service">
          <P>Ma Bibliothèque est une application mobile gratuite de gestion de bibliothèque personnelle. Elle permet à ses utilisateurs de cataloguer leurs livres, suivre leurs lectures, gérer des prêts et partager leur bibliothèque avec leurs contacts.</P>
          <P>Éditeur : Quentin Diaz de Cerio</P>
          <P>Contact : quentin.ddc@hotmail.fr</P>
          <P>Site : mabibliotheque.ovh</P>
        </Section>

        <Section title="2. Acceptation des conditions">
          <P>L'utilisation de l'application implique l'acceptation pleine et entière des présentes CGU. Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser l'application.</P>
          <P>Ces CGU s'appliquent à l'application mobile Android et à toute interface web associée.</P>
        </Section>

        <Section title="3. Inscription et compte utilisateur">
          <H3>3.1 Création de compte</H3>
          <P>L'inscription est gratuite et ouverte. Vous devez fournir une adresse e-mail valide et choisir un nom d'utilisateur. Votre adresse e-mail doit être vérifiée pour activer le compte.</P>

          <H3>3.2 Obligations de l'utilisateur</H3>
          <P>Vous vous engagez à :</P>
          <BulletList items={[
            'Fournir des informations exactes lors de l\'inscription',
            'Maintenir la confidentialité de votre mot de passe',
            'Ne pas partager votre compte avec des tiers',
            'Utiliser l\'application à des fins personnelles et non commerciales',
            'Ne pas tenter de contourner les mécanismes de sécurité de l\'application',
          ]} />

          <H3>3.3 Compte inactif</H3>
          <P>Nous nous réservons le droit de désactiver un compte en cas d'inactivité prolongée (plus de 24 mois), après notification préalable par e-mail.</P>
        </Section>

        <Section title="4. Usage personnel — restrictions">
          <P>L'application est conçue pour un usage personnel exclusivement. Il est interdit de l'utiliser pour :</P>
          <BulletList items={[
            'Constituer une base de données commerciale de livres',
            'Revendre ou redistribuer des données extraites de l\'application',
            'Automatiser des actions en masse (scraping, bots)',
            'Toute activité illégale ou contraire aux droits de tiers',
          ]} />
        </Section>

        <Section title="5. Contenu uploadé par l'utilisateur">
          <H3>5.1 Couvertures de livres</H3>
          <P>Vous pouvez uploader des images de couvertures de livres. En le faisant, vous déclarez :</P>
          <BulletList items={[
            'Être propriétaire des droits sur l\'image, ou que son utilisation est légalement autorisée (usage personnel, fair use, domaine public)',
            'Que l\'image ne contient pas de contenu illégal, offensant ou contraire aux bonnes mœurs',
          ]} />
          <P>L'application accepte les formats JPEG, PNG, WebP et GIF, dans une limite de 15 Mo. Les images sont automatiquement redimensionnées (600×900 px max).</P>

          <H3>5.2 Notes et annotations</H3>
          <P>Les notes personnelles que vous rédigez sur vos livres restent privées et ne sont visibles que par vous, sauf si vous activez explicitement le partage de bibliothèque avec un contact.</P>

          <H3>5.3 Modération</H3>
          <P>Nous nous réservons le droit de supprimer tout contenu signalé comme inapproprié ou illégal.</P>
        </Section>

        <Section title="6. Fonctionnalités sociales">
          <H3>6.1 Contacts et partage de bibliothèque</H3>
          <P>Vous pouvez inviter d'autres utilisateurs à devenir contacts et partager votre bibliothèque en lecture seule. Le partage est facultatif et révocable à tout moment.</P>

          <H3>6.2 Prêts entre membres</H3>
          <P>La fonctionnalité de prêt entre membres est un outil d'organisation personnel. Nous n'intervenons pas dans les transactions de prêt et n'assumons aucune responsabilité en cas de litige entre utilisateurs concernant un prêt.</P>
        </Section>

        <Section title="7. Liens affiliés Amazon">
          <P>Certaines fiches livres peuvent afficher un bouton "Voir sur Amazon" contenant un lien affilié Amazon Associates (identifiant : mabibliothe08-21). Si vous effectuez un achat via ce lien, nous pouvons percevoir une commission d'affiliation sur les achats éligibles. Ce bouton est strictement facultatif et n'influence pas les fonctionnalités de l'application.</P>
        </Section>

        <Section title="8. Disponibilité du service">
          <P>L'application est fournie telle quelle, sans garantie de disponibilité continue. Nous nous efforçons de maintenir le service accessible mais nous ne pouvons garantir une disponibilité de 100 %, notamment en raison des contraintes liées à l'hébergement sur infrastructure domestique.</P>
          <P>Des interruptions pour maintenance peuvent survenir, idéalement annoncées à l'avance via l'application.</P>
        </Section>

        <Section title="9. Limitation de responsabilité">
          <P>Dans les limites permises par la loi applicable :</P>
          <BulletList items={[
            'Nous ne sommes pas responsables de la perte de données due à une défaillance technique (nous vous encourageons à utiliser la fonction d\'export CSV régulièrement)',
            'Nous ne sommes pas responsables des litiges entre utilisateurs dans le cadre des fonctionnalités sociales ou de prêt',
            'Nous ne garantissons pas l\'exactitude des métadonnées de livres récupérées depuis Google Books ou OpenLibrary',
            'Nous ne sommes pas responsables du contenu des sites tiers vers lesquels des liens peuvent pointer (notamment Amazon)',
          ]} />
        </Section>

        <Section title="10. Propriété intellectuelle">
          <P>Le code, le design, le logo et le nom "Ma Bibliothèque" sont la propriété de l'éditeur. Les données que vous saisissez dans l'application (votre bibliothèque, vos notes, vos contacts) restent votre propriété. L'application ne revendique aucun droit sur votre contenu.</P>
        </Section>

        <Section title="11. Suppression de compte">
          <P>Vous pouvez supprimer votre compte à tout moment depuis les paramètres de l'application. La suppression est immédiate et entraîne l'effacement définitif de toutes vos données (voir la politique de confidentialité pour le détail).</P>
        </Section>

        <Section title="12. Modifications des CGU">
          <P>Nous nous réservons le droit de modifier ces CGU. En cas de modification substantielle, vous en serez informé via l'application ou par e-mail. La poursuite de l'utilisation de l'application après notification vaut acceptation des nouvelles conditions.</P>
        </Section>

        <Section title="13. Droit applicable">
          <P>Les présentes CGU sont soumises au droit français. En cas de litige, et à défaut de résolution amiable, les tribunaux français seront compétents.</P>
        </Section>

        <Section title="14. Contact">
          <P>Pour toute question relative aux présentes CGU : quentin.ddc@hotmail.fr</P>
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

function P({ children }: { children: React.ReactNode }) {
  return <Text style={styles.p}>{children}</Text>;
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

  bulletList: { marginBottom: 10 },
  bulletItem: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  bullet: { fontSize: 15, color: ACCENT, marginTop: 2 },
  bulletText: { flex: 1, fontSize: 15, color: '#444', lineHeight: 24 },

  footer: { backgroundColor: '#1a1a1a', paddingVertical: 40 },
  footerInner: { maxWidth: 960, width: '100%', alignSelf: 'center', paddingHorizontal: 32 },
  footerLogo: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 8 },
  footerText: { fontSize: 13, color: '#888' },
});
