'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@kit/ui/table';

interface ColumnMappingProps {
  file: File;
  onComplete: () => void;
}

export function ColumnMapping({ file }: ColumnMappingProps) {
  const [mappings, setMappings] = useState<Record<string, string>>({});

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Faites correspondre les colonnes de votre fichier aux champs VendorShield
      </p>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colonne source</TableHead>
              <TableHead>Champ cible</TableHead>
              <TableHead>Obligatoire</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Supplier ID</TableCell>
              <TableCell>supplier_id</TableCell>
              <TableCell>Oui</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Delivery Date</TableCell>
              <TableCell>delivery_date</TableCell>
              <TableCell>Oui</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>PPM</TableCell>
              <TableCell>ppm</TableCell>
              <TableCell>Non</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
