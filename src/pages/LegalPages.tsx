import { Link } from 'react-router-dom';
import { LegalLayout, Contact } from '../components/legal/LegalLayout';

export function SafetyPage() {
  return (
    <LegalLayout title="Safety" draft={false}>
      <p>Your safety matters more than anything else on Mumbai Afterhours. These are the tools we give you, and what they do and do not do.</p>
      <h2>Tools you control</h2>
      <ul>
        <li><strong>Report.</strong> Use Report on any profile or chat. Reports are private. The person you report is not told it was you.</li>
        <li><strong>Block.</strong> You and the other person will not see each other again, and any chat between you closes.</li>
        <li><strong>Unmatch.</strong> Ends a match and hides the chat for both of you.</li>
        <li><strong>Hide your profile.</strong> In Settings, you can stop appearing in Discover at any time.</li>
        <li><strong>Neighbourhood.</strong> We only ever show a neighbourhood you choose, never your exact location. You can hide it.</li>
      </ul>
      <h2>What the verified badge means</h2>
      <p>A blue badge means a member of our team compared a selfie with the three profile photos and found them to be the same person. It is not an ID check, a background check, or a guarantee of anyone’s behaviour or safety.</p>
      <h2>Meeting someone</h2>
      <ul>
        <li>Meet in a public place, and tell a friend where you are going.</li>
        <li>Arrange your own transport.</li>
        <li>Do not send money or share financial details with someone you have not met.</li>
        <li>Leave if you feel uncomfortable. You do not owe anyone an explanation.</li>
      </ul>
      <h2>What we do not allow</h2>
      <p>Fake or borrowed photos, AI-generated photos, impersonation, harassment, scams, sexual or abusive content, and anyone under 18. We review reports and can suspend accounts.</p>
      <h2>Emergencies</h2>
      <p>If you are in danger, contact local emergency services first (in India, 112). Then report the person to us. We are not an emergency service.</p>
      <p>Other questions: <Link to="/help">Help</Link>. Contact: <Contact />.</p>
    </LegalLayout>
  );
}

export function TermsPage() {
  return (
    <LegalLayout title="Terms of service">
      <p>By creating an account you agree to these terms.</p>
      <h2>Who can use Mumbai Afterhours</h2>
      <p>You must be 18 or older. We check your date of birth when you sign up and do not allow anyone younger to publish a profile. We remove accounts that we believe belong to someone under 18.</p>
      <h2>Your profile</h2>
      <ul>
        <li>Be honest about who you are. Use only photos of yourself, with exactly three on your profile.</li>
        <li>Do not use AI-generated, heavily edited or someone else’s photos. We cannot reliably detect these automatically, so we rely on reports and review.</li>
        <li>You are responsible for what you post and send.</li>
      </ul>
      <h2>Conduct</h2>
      <p>Do not harass, threaten, scam, spam or impersonate anyone, and do not post illegal, sexual or abusive content. We may suspend or remove accounts that break these rules.</p>
      <h2>Verification</h2>
      <p>Verification is optional. It is a manual photo comparison and is not a background or ID check.</p>
      <h2>Messages and meeting people</h2>
      <p>We are a platform that introduces people. We do not control who you meet and are not responsible for what members say or do. Take sensible precautions (see <Link to="/safety">Safety</Link>).</p>
      <h2>Free service</h2>
      <p>The service is currently free. If paid features are introduced, they will be clearly marked and basic safety tools will remain free.</p>
      <h2>Ending your account</h2>
      <p>You can delete your account at any time from <Link to="/delete-account">account deletion</Link>. We may suspend accounts that break these terms.</p>
      <h2>Changes and contact</h2>
      <p>We may update these terms and will say so in the app. Contact: <Contact />.</p>
    </LegalLayout>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy policy">
      <p>This explains what we collect and why. We do not sell your data and we do not show ads.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account:</strong> your email address (or Google account email) and a password handled by our authentication provider. We never see or store your password ourselves.</li>
        <li><strong>Profile:</strong> name, date of birth, gender, who you want to meet, optional neighbourhood, bio, languages, interests and three photos. Others see your age, never your date of birth.</li>
        <li><strong>Activity:</strong> likes, passes, matches, blocks, reports you file, and messages.</li>
        <li><strong>Consents:</strong> when you accepted the terms and privacy policy, and, if you verify, your consent to process a selfie.</li>
        <li><strong>Selfie (only if you verify):</strong> one photo, stored privately.</li>
      </ul>
      <p>We do not collect your GPS location.</p>
      <h2>Who can see what</h2>
      <ul>
        <li>Other members see your published profile while it is visible. Matches can still see your photos if you hide your profile.</li>
        <li>Only the two people in a chat can read it. Our team does not browse private messages. Reports may lead us to look at the reported content.</li>
        <li>Selfies are visible only to reviewers on our team. They are never shown to members.</li>
        <li>Reports are private and are visible to you and our moderators.</li>
      </ul>
      <h2>Selfies and facial data</h2>
      <p>A person on our team compares your selfie to your three photos. We do not use automated face recognition and we do not create or keep facial templates. The selfie file is deleted when the reviewer records a decision; we keep the date and result. Selfies are never used for advertising.</p>
      <h2>Photos</h2>
      <p>Before upload, photos are re-saved in your browser, which removes location data embedded in the file.</p>
      <h2>Where data is stored</h2>
      <p>We use Supabase (database, authentication, file storage) as our infrastructure provider. Google is used only if you choose to sign in with Google.</p>
      <h2>Deleting your data</h2>
      <p>When you delete your account, your profile, photos, selfies, likes, matches, messages and reports are permanently erased, and your chats disappear for the people you matched with. We keep one minimal record that an account was deleted (a one-way hash of the account id and the time) for audit purposes. Backups kept by our infrastructure provider may take additional time to expire.</p>
      <h2>Your choices</h2>
      <p>You can edit your profile, hide it, hide your neighbourhood, block people and delete your account in Settings.</p>
      <h2>Contact</h2>
      <p><Contact /></p>
    </LegalLayout>
  );
}

export function HelpPage() {
  const qa: [string, string][] = [
    ['Why can’t I see anyone in Discover?', 'You need a published profile with three photos. Also check your age range in Settings > Privacy. If nobody new fits your preferences, check back later.'],
    ['Why did my verified badge disappear?', 'Changing any photo removes the badge, because the review compared your selfie to your old photos. You can verify again from your profile.'],
    ['How do I leave the app completely?', 'Open Settings, then Delete account. This is permanent.'],
    ['Someone is bothering me.', 'Block or report them from their profile card or the chat menu. See Safety for more.'],
    ['I forgot my password.', 'Use “Forgot password?” on the log-in page.'],
    ['I can’t upload a photo.', 'Use a JPEG, PNG or WebP under 8 MB, at least 600 pixels on the short side.']
  ];
  return (
    <LegalLayout title="Help and support" draft={false}>
      {qa.map(([q, a]) => <div key={q}><h2 className="!mt-4 !text-base">{q}</h2><p>{a}</p></div>)}
      <p>Still stuck? Contact: <Contact />. For safety concerns see <Link to="/safety">Safety</Link>.</p>
    </LegalLayout>
  );
}
