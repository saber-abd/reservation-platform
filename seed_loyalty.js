import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	console.error('Missing Supabase URL or Anon Key in .env');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
	console.log('--- SEED LOYALTY CLIENTS ---');

	// 1. Get the primary professional
	const { data: pros, error: proError } = await supabase.from('professionals').select('id').limit(1);
	if (proError || !pros || pros.length === 0) {
		console.error('No professional found in database.');
		process.exit(1);
	}
	const professionalId = pros[0].id;
	
	// 2. Get a random service
	const { data: services, error: srvError } = await supabase.from('services').select('id').eq('professional_id', professionalId).limit(1);
	if (srvError || !services || services.length === 0) {
		console.error('No service found for professional.');
		process.exit(1);
	}
	const serviceId = services[0].id;

	const testClients = [
		{
			email: 'client.fidelite1@mailinator.com',
			password: 'password123',
			name: 'Client VIP',
			passages: 7, // 700 pts -> Or
		}
	];

	const outputLog = [];

	for (const tc of testClients) {
		console.log(`\nProcessing ${tc.email}...`);
		// Try to sign up
		const { data: authData, error: authError } = await supabase.auth.signUp({
			email: tc.email,
			password: tc.password,
			options: { data: { full_name: tc.name } }
		});

		if (authError) {
			console.log(`Failed to create auth user for ${tc.email}: ${authError.message}`);
			// Might already exist, let's try to sign in
			const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
				email: tc.email,
				password: tc.password,
			});
			if (signInError) {
				console.log(`Also failed to sign in: ${signInError.message}. Skipping.`);
				continue;
			}
			console.log(`User already exists, signed in as ${tc.email}`);
		} else {
			console.log(`Auth user created for ${tc.email}`);
			// Check if email confirmation is required
			if (!authData.session) {
				console.log('WARNING: Email confirmation is required! These users cannot log in without confirming their email. Please disable email confirmation in Supabase Auth settings (Authentication -> Providers -> Email -> "Confirm email").');
			}
		}

		// Get current user to get ID
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) continue;

		const clientId = user.id;

		// The client profile might be auto-created via trigger, or we might need to upsert
		await supabase.from('clients').upsert({ id: clientId, full_name: tc.name, phone: '0600000000' });

		// Delete existing appointments to reset
		await supabase.from('appointments').delete().eq('client_id', clientId);

		// Insert historical appointments
		const appointmentsToInsert = [];
		const now = new Date();
		for (let i = 0; i < tc.passages; i++) {
			// Spread appointments over past months
			const pastDate = new Date(now);
			pastDate.setMonth(now.getMonth() - i);
			
			appointmentsToInsert.push({
				professional_id: professionalId,
				service_id: serviceId,
				client_id: clientId,
				client_name: tc.name,
				client_email: tc.email,
				client_phone: '0600000000',
				start_time: pastDate.toISOString(),
				end_time: new Date(pastDate.getTime() + 60 * 60 * 1000).toISOString(),
				status: 'completed'
			});
		}

		const { error: insertError } = await supabase.from('appointments').insert(appointmentsToInsert);
		if (insertError) {
			console.log(`Error inserting appointments: ${insertError.message}`);
		} else {
			console.log(`Inserted ${tc.passages} completed appointments for ${tc.email}`);
		}

		// Sign out to process next user
		await supabase.auth.signOut();

		outputLog.push(`- Email: ${tc.email}\n  Mot de passe: ${tc.password}\n  Grade attendu: ${tc.passages < 3 ? 'Bronze' : tc.passages < 6 ? 'Argent' : 'Or'}`);
	}

	// Write output log
	const credentialsText = `=== IDENTIFIANTS DE TEST FIDELITE ===\n\n${outputLog.join('\n\n')}\n`;
	fs.writeFileSync('./comptes_test_fidelite.txt', credentialsText);
	console.log('\nTerminé. Les identifiants sont sauvegardés dans comptes_test_fidelite.txt');
}

main();
