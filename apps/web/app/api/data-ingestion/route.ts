/**
 * POST /api/data-ingestion
 * Bridge endpoint between frontend upload and Supabase Edge Function
 * 
 * PHASE 1.2: Data Quality Gate validation
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { rows, columnMapping, accountId } = body;

    // Validate inputs
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'No rows provided' },
        { status: 400 }
      );
    }

    if (!columnMapping || typeof columnMapping !== 'object') {
      return NextResponse.json(
        { error: 'Invalid column mapping' },
        { status: 400 }
      );
    }

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client (uses NEXT_PUBLIC env vars + service role)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      console.error('[data-ingestion] Missing Supabase credentials');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call Supabase Edge Function for validation
    const { data, error } = await supabase.functions.invoke('data-ingestion', {
      body: {
        rows,
        columnMapping,
        accountId,
      },
    });

    if (error) {
      console.error('[data-ingestion] Edge function error:', error);
      return NextResponse.json(
        {
          total_rows: rows.length,
          valid_rows: rows.length,
          blocked_rows: 0,
          warning_rows: 1,
          quality_score: rows.length > 0 ? 100 : 0,
          errors: [],
          warnings: [
            {
              row_number: 0,
              column_name: 'system',
              error_rule: 'Validation service unavailable',
              error_level: 'Avertissement',
              error_value: 'edge-function-failed',
              suggestion:
                'La validation distante est indisponible. Continuez avec le mapping manuel et relancez la qualité plus tard.',
            },
          ],
          fallback_mode: true,
          details: String(error?.message || error),
        },
        { status: 200 }
      );
    }

    // Normalize the response from the Edge Function: ensure we always return JSON.
    let payload: any = null;
    try {
      if (typeof data === 'string') {
        payload = JSON.parse(data);
      } else if (data && typeof data === 'object' && 'body' in data) {
        // Some runtimes return a Response-like object
        try {
          payload = JSON.parse(String((data as any).body));
        } catch {
          payload = { raw: String((data as any).body) };
        }
      } else {
        payload = data;
      }
    } catch (e) {
      console.error('[data-ingestion] Invalid JSON from edge function:', e);
      payload = {
        total_rows: rows.length,
        valid_rows: rows.length,
        blocked_rows: 0,
        warning_rows: 1,
        quality_score: rows.length > 0 ? 100 : 0,
        errors: [],
        warnings: [
          {
            row_number: 0,
            column_name: 'system',
            error_rule: 'Validation service invalid response',
            error_level: 'Avertissement',
            error_value: 'edge-function-invalid-json',
            suggestion:
              'La validation distante a renvoyé une réponse inattendue. Continuez avec le mapping manuel et relancez la qualité plus tard.',
          },
        ],
        fallback_mode: true,
        details: String(e instanceof Error ? e.message : e),
      };
    }

    // Return validation results (normalized)
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error('[data-ingestion] API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
